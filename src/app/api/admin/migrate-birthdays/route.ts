import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

/**
 * 🔧 MIGRAÇÃO: Adicionar birthMonth e birthDay aos clientes existentes
 * 
 * Este endpoint deve ser rodado UMA VEZ para atualizar todos os clientes existentes
 * Adiciona os campos birthMonth e birthDay para otimizar queries de aniversário
 * 
 * ⚠️ IMPORTANTE: Protegido por ADMIN_SECRET
 */
export async function POST(request: Request) {
    // Segurança: Verificar admin secret
    const authHeader = request.headers.get('authorization');
    const adminSecret = process.env.ADMIN_SECRET || process.env.CRON_SECRET;
    
    if (!authHeader || authHeader !== `Bearer ${adminSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('🔧 Starting birthday migration...');
    
    try {
        const businessesSnapshot = await adminDb.collection('negocios').get();
        
        let totalClients = 0;
        let migratedClients = 0;
        let skippedClients = 0;
        let errorClients = 0;
        
        for (const businessDoc of businessesSnapshot.docs) {
            const businessId = businessDoc.id;
            const businessName = businessDoc.data().nome || businessId;
            
            console.log(`📦 Processing business: ${businessName}`);
            
            const clientsSnapshot = await adminDb
                .collection(`negocios/${businessId}/clientes`)
                .get();
            
            totalClients += clientsSnapshot.size;
            
            // Processar em lotes de 50
            const BATCH_SIZE = 50;
            const clients = clientsSnapshot.docs;
            
            for (let i = 0; i < clients.length; i += BATCH_SIZE) {
                const batch = clients.slice(i, i + BATCH_SIZE);
                
                await Promise.all(batch.map(async (clientDoc) => {
                    try {
                        const clientData = clientDoc.data();
                        
                        // Se já tem birthMonth e birthDay, pular
                        if (clientData.birthMonth && clientData.birthDay) {
                            skippedClients++;
                            return;
                        }
                        
                        // Se não tem birthDate, pular
                        if (!clientData.birthDate) {
                            skippedClients++;
                            return;
                        }
                        
                        // Extrair mês e dia
                        const birthDate = new Date(clientData.birthDate);
                        if (isNaN(birthDate.getTime())) {
                            console.warn(`Invalid birthDate for client: ${clientDoc.id}`);
                            errorClients++;
                            return;
                        }
                        
                        const birthMonth = birthDate.getMonth() + 1; // 1-12
                        const birthDay = birthDate.getDate(); // 1-31
                        
                        // Atualizar documento
                        await clientDoc.ref.update({
                            birthMonth,
                            birthDay
                        });
                        
                        migratedClients++;
                        
                        if (migratedClients % 100 === 0) {
                            console.log(`✓ Migrated ${migratedClients} clients...`);
                        }
                    } catch (error) {
                        console.error(`Error migrating client ${clientDoc.id}:`, error);
                        errorClients++;
                    }
                }));
            }
        }
        
        console.log('✅ Migration completed!');
        console.log(`📊 Total clients: ${totalClients}`);
        console.log(`✓ Migrated: ${migratedClients}`);
        console.log(`⊘ Skipped: ${skippedClients}`);
        console.log(`✗ Errors: ${errorClients}`);
        
        return NextResponse.json({
            success: true,
            message: 'Birthday migration completed',
            stats: {
                totalClients,
                migratedClients,
                skippedClients,
                errorClients
            }
        });
        
    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        return NextResponse.json({ 
            error: 'Migration failed', 
            message: error.message 
        }, { status: 500 });
    }
}
