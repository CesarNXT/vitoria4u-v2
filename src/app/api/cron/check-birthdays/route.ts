import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { notifyBirthday } from '@/lib/notifications';
import { checkCronAuth } from '@/lib/cron-auth';

export async function GET(request: Request) {
    const authError = checkCronAuth(request);
    if (authError) return authError;
    
    try {
        const today = new Date();
        const todayMonth = today.getMonth() + 1;
        const todayDay = today.getDate();
        
        const businessesSnapshot = await adminDb.collection('negocios')
            .where('whatsappConectado', '==', true)
            .where('habilitarAniversario', '==', true)
            .get();
        
        let birthdayCount = 0;
        let birthdaySuccess = 0;
        let birthdayFailed = 0;
        let businessesProcessed = 0;
        let totalReads = businessesSnapshot.size;
        const errorDetails: any[] = [];
        const successDetails: any[] = [];

        const BATCH_SIZE = 20;
        const businesses = businessesSnapshot.docs;
        
        for (let i = 0; i < businesses.length; i += BATCH_SIZE) {
            const batch = businesses.slice(i, i + BATCH_SIZE);
            
            await Promise.all(batch.map(async (businessDoc) => {
                const businessData = businessDoc.data();
                const businessId = businessDoc.id;

                if (!businessData.tokenInstancia) {
                    return;
                }

                const clientsSnapshot = await adminDb
                    .collection(`negocios/${businessId}/clientes`)
                    .where('birthMonth', '==', todayMonth)
                    .where('birthDay', '==', todayDay)
                    .get();
                
                totalReads += clientsSnapshot.size;
                
                if (clientsSnapshot.empty) {
                    return;
                }
                
                await Promise.all(clientsSnapshot.docs.map(async (clientDoc) => {
                    const clientData = clientDoc.data();
                    
                    try {
                        await notifyBirthday({
                            tokenInstancia: businessData.tokenInstancia,
                            telefoneCliente: clientData.phone,
                            nomeCliente: clientData.name,
                            nomeEmpresa: businessData.nome
                        });
                        
                        birthdayCount++;
                        birthdaySuccess++;
                        
                        successDetails.push({
                            cliente: clientData.name,
                            telefone: clientData.phone,
                            negocio: businessData.nome
                        });
                    } catch (error: any) {
                        birthdayCount++;
                        birthdayFailed++;
                        errorDetails.push({
                            cliente: clientData.name,
                            telefone: clientData.phone,
                            negocio: businessData.nome,
                            erro: error.message || 'Unknown error'
                        });
                        console.error(`Erro ao enviar aniversário para ${clientData.name}:`, error);
                    }
                }));

                if (clientsSnapshot.size > 0) {
                    businessesProcessed++;
                }
            }));
        }
        
        if (birthdayFailed > 0) {
            console.warn('Erros detectados:', errorDetails);
        }
        
        return NextResponse.json({ 
            message: `Birthday checks completed. Found ${birthdayCount} birthdays in ${businessesProcessed} businesses.`,
            birthdayCount,
            birthdaySuccess,
            birthdayFailed,
            businessesProcessed,
            totalReads,
            successList: successDetails,
            errors: errorDetails,
            optimization: `Saved ${2000 - totalReads} reads!`
        });
    } catch (error) {
        console.error('CRON Job (check-birthdays) failed:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
