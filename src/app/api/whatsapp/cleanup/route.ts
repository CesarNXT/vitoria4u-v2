import { NextRequest, NextResponse } from 'next/server';

const API_BASE = process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 'https://vitoria4u.uazapi.com';
const API_TOKEN = process.env.NEXT_PUBLIC_WHATSAPP_API_TOKEN || '';

/**
 * 🧹 LIMPEZA DE INSTÂNCIAS ÓRFÃS
 * 
 * Este endpoint deleta TODAS as instâncias que não estão conectadas
 * Use com cuidado - apenas em desenvolvimento ou manutenção
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Buscar todas as instâncias
    const response = await fetch(`${API_BASE}/instance`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Erro ao buscar instâncias' },
        { status: 500 }
      );
    }

    const instances = await response.json();
    
    // 2. Filtrar instâncias desconectadas
    const disconnectedInstances = instances.filter((inst: any) => 
      inst.status !== 'connected'
    );

    // 3. Deletar todas as instâncias desconectadas
    const deletedInstances: string[] = [];
    const errors: string[] = [];

    for (const inst of disconnectedInstances) {
      try {
        const deleteResponse = await fetch(`${API_BASE}/instance`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'token': inst.token,
          },
        });

        if (deleteResponse.ok) {
          deletedInstances.push(inst.name);
        } else {
          errors.push(`${inst.name}: ${deleteResponse.statusText}`);
        }
      } catch (err: any) {
        errors.push(`${inst.name}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      total: instances.length,
      disconnected: disconnectedInstances.length,
      deleted: deletedInstances.length,
      deletedInstances,
      errors,
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
