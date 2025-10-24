import { NextRequest, NextResponse } from 'next/server';
import { 
  validateInstanceWebhook,
  validateAndFixWebhook,
  validateAllWebhooks,
  fixAllWebhooks 
} from '@/lib/webhook-validator';

/**
 * 🛡️ API para validar e corrigir webhooks
 * 
 * Rotas:
 * - GET ?businessId=xxx → Valida uma instância específica
 * - GET ?action=validate-all → Valida todas as instâncias
 * - POST ?businessId=xxx → Valida e corrige uma instância
 * - POST ?action=fix-all → Valida e corrige todas
 */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action');

    // Validar uma instância específica
    if (businessId) {
      const result = await validateInstanceWebhook(businessId);
      return NextResponse.json(result);
    }

    // Validar todas as instâncias
    if (action === 'validate-all') {
      const results = await validateAllWebhooks();
      
      const summary = {
        total: results.length,
        valid: results.filter(r => r.isValid).length,
        needsFix: results.filter(r => r.needsFix).length,
        errors: results.filter(r => r.error).length,
        results
      };

      return NextResponse.json(summary);
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos. Use ?businessId=xxx ou ?action=validate-all' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[VALIDATE-WEBHOOKS] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId');
    const action = searchParams.get('action');

    // Corrigir uma instância específica
    if (businessId) {
      const result = await validateAndFixWebhook(businessId);
      return NextResponse.json(result);
    }

    // Corrigir todas as instâncias
    if (action === 'fix-all') {
      const results = await fixAllWebhooks();
      return NextResponse.json(results);
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos. Use ?businessId=xxx ou ?action=fix-all' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[FIX-WEBHOOKS] Erro:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
