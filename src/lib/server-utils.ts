"use server";

import type { ConfiguracoesNegocio, Plano, PlanFeature } from "./types";
import { adminDb } from "./firebase-admin";

/**
 * Verifica se um negócio tem acesso a uma funcionalidade específica, buscando o plano no DB.
 * Esta função deve rodar apenas no servidor.
 * @param businessSettings As configurações do negócio.
 * @param feature A feature a ser verificada.
 * @returns {Promise<boolean>} True se o plano do negócio incluir a feature.
 */
export async function checkFeatureAccess(businessSettings: ConfiguracoesNegocio, feature: PlanFeature): Promise<boolean> {
    if (!businessSettings.planId) {
        return false;
    }

    const planDoc = await adminDb.collection('planos').doc(businessSettings.planId).get();
    if (!planDoc.exists) {
        return false;
    }

    const plan = planDoc.data() as Plano;
    
    // A verificação de whatsappConectado deve ser feita no local da chamada,
    // pois nem toda feature depende disso.
    return plan.features.includes(feature);
}
