import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/address/cep?cep=01310100
 * 
 * Busca informações de endereço a partir do CEP usando ViaCEP (API pública e confiável)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cep = searchParams.get('cep');

    if (!cep) {
      return NextResponse.json(
        { error: 'CEP é obrigatório' },
        { status: 400 }
      );
    }

    // Validar formato do CEP (8 dígitos)
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      return NextResponse.json(
        { error: 'CEP deve conter 8 dígitos' },
        { status: 400 }
      );
    }

    // Formatar CEP (XXXXX-XXX)
    const formattedCep = `${cleanCep.slice(0, 5)}-${cleanCep.slice(5)}`;

    // ✅ Consultar ViaCEP com timeout e retry
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos timeout

    try {
      const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!viaCepResponse.ok) {
        throw new Error(`ViaCEP retornou status ${viaCepResponse.status}`);
      }
      
      const viaCepData = await viaCepResponse.json();
      
      // Verificar se o CEP foi encontrado
      if (viaCepData.erro) {
        return NextResponse.json(
          { error: 'CEP não encontrado' },
          { status: 404 }
        );
      }

      // Validar campos obrigatórios
      if (!viaCepData.logradouro || !viaCepData.localidade || !viaCepData.uf) {
        return NextResponse.json(
          { error: 'Dados de endereço incompletos para este CEP' },
          { status: 404 }
        );
      }

      // Retornar dados no formato esperado
      return NextResponse.json({
        cep: formattedCep,
        logradouro: viaCepData.logradouro,
        bairro: viaCepData.bairro || '',
        localidade: viaCepData.localidade,
        uf: viaCepData.uf.toUpperCase(),
      });
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      // Se foi timeout ou erro de rede, tentar API alternativa (BrasilAPI)
      console.warn('ViaCEP falhou, tentando BrasilAPI:', fetchError.message);
      
      try {
        const brasilApiResponse = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCep}`, {
          headers: {
            'Accept': 'application/json',
          },
        });
        
        if (brasilApiResponse.ok) {
          const brasilApiData = await brasilApiResponse.json();
          
          return NextResponse.json({
            cep: formattedCep,
            logradouro: brasilApiData.street || '',
            bairro: brasilApiData.neighborhood || '',
            localidade: brasilApiData.city || '',
            uf: brasilApiData.state?.toUpperCase() || '',
          });
        }
      } catch (fallbackError) {
        console.error('BrasilAPI também falhou:', fallbackError);
      }
      
      // Se ambas APIs falharam
      throw new Error('Serviço de consulta CEP temporariamente indisponível');
    }

  } catch (error: any) {
    console.error('Erro ao buscar CEP:', error);
    
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar endereço. Tente novamente.' },
      { status: 500 }
    );
  }
}
