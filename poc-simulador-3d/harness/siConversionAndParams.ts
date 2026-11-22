// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): CONVERSIONES SI Y PARÁMETROS XPBD/PBD
// Archivo: poc-simulador-3d/harness/siConversionAndParams.ts
// ==============================================================================
// Implementa estrictamente las ecuaciones dimensionales definidas en T1 y V2.6 §4.2.
// ==============================================================================

import { BendingRigiditySpec } from './types';

export const STANDARD_GRAVITY_M_S2 = 9.80665;
export const GF_CM_TO_NM = 9.80665e-5;
export const GF_CM_TO_MICRO_NM = 98.0665;

function assertPositiveFinite(value: number, label: string): void {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`${label} debe ser finito y > 0 (recibido: ${value})`);
    }
}

function assertNonNegativeFinite(value: number, label: string): void {
    if (!Number.isFinite(value) || value < 0) {
        throw new RangeError(`${label} debe ser finito y >= 0 (recibido: ${value})`);
    }
}

/**
 * Convierte masa superficial de [g/m^2] a unidad SI [kg/m^2].
 */
export function gsmToKgPerSqM(gsm: number): number {
    assertPositiveFinite(gsm, 'gsm');
    return gsm * 1e-3;
}

/**
 * Convierte rigidez flexural KES-FB2 [gf*cm^2/cm = gf*cm] a SI [N*m] y [uN*m].
 */
export function kesBendingToSiNm(bKesGfCm: number): { rigidityNm: number; rigidityMicroNm: number } {
    assertNonNegativeFinite(bKesGfCm, 'bKesGfCm');
    return {
        rigidityNm: bKesGfCm * GF_CM_TO_NM,
        rigidityMicroNm: bKesGfCm * GF_CM_TO_MICRO_NM,
    };
}

/**
 * Convierte rigidez flexural ASTM D1388 G [mg*cm] = 0.1 * gsm * c_cm^3 a [uN*m] y [N*m].
 */
export function astmD1388BendingFromCantileverCm(
    arealMassGsm: number,
    bendingLengthCm: number
): { gMgCm: number; rigidityMicroNm: number; rigidityNm: number } {
    assertPositiveFinite(arealMassGsm, 'arealMassGsm');
    assertNonNegativeFinite(bendingLengthCm, 'bendingLengthCm');
    const c3 = bendingLengthCm ** 3;
    const gMgCm = 0.1 * arealMassGsm * c3;
    const rigidityMicroNm = gMgCm * 0.0980665;
    return {
        gMgCm,
        rigidityMicroNm,
        rigidityNm: rigidityMicroNm * 1e-6,
    };
}

/**
 * Calcula masas nodales lumped m_i [kg] e inversas w_i [kg^-1] por conservación exacta
 * de masa superficial sobre la triangulación en reposo.
 */
export function computeTriangleLumpedMasses(
    restPositionsM: Float64Array | readonly number[],
    triangleIndices: Uint32Array | readonly number[],
    arealMassKgPerSqM: number,
    pinnedVertexIndices: ReadonlySet<number> = new Set()
): { massesKg: Float64Array; inverseMassesPerKg: Float64Array; totalSurfaceMassKg: number } {
    assertPositiveFinite(arealMassKgPerSqM, 'arealMassKgPerSqM');
    if (restPositionsM.length % 3 !== 0) {
        throw new RangeError('restPositionsM debe tener longitud múltiplo de 3');
    }
    if (triangleIndices.length % 3 !== 0) {
        throw new RangeError('triangleIndices debe tener longitud múltiplo de 3');
    }

    const vertexCount = restPositionsM.length / 3;
    const massesKg = new Float64Array(vertexCount);
    let totalSurfaceMassKg = 0;

    for (let t = 0; t < triangleIndices.length; t += 3) {
        const ia = triangleIndices[t];
        const ib = triangleIndices[t + 1];
        const ic = triangleIndices[t + 2];

        const ax = restPositionsM[ia * 3];
        const ay = restPositionsM[ia * 3 + 1];
        const az = restPositionsM[ia * 3 + 2];

        const abx = restPositionsM[ib * 3] - ax;
        const aby = restPositionsM[ib * 3 + 1] - ay;
        const abz = restPositionsM[ib * 3 + 2] - az;

        const acx = restPositionsM[ic * 3] - ax;
        const acy = restPositionsM[ic * 3 + 1] - ay;
        const acz = restPositionsM[ic * 3 + 2] - az;

        const cx = aby * acz - abz * acy;
        const cy = abz * acx - abx * acz;
        const cz = abx * acy - aby * acx;
        const areaM2 = 0.5 * Math.hypot(cx, cy, cz);

        const triMassKg = arealMassKgPerSqM * areaM2;
        totalSurfaceMassKg += triMassKg;
        const thirdMass = triMassKg / 3;
        massesKg[ia] += thirdMass;
        massesKg[ib] += thirdMass;
        massesKg[ic] += thirdMass;
    }

    const inverseMassesPerKg = new Float64Array(vertexCount);
    for (let i = 0; i < vertexCount; i++) {
        if (pinnedVertexIndices.has(i) || massesKg[i] <= 0) {
            inverseMassesPerKg[i] = 0;
        } else {
            inverseMassesPerKg[i] = 1 / massesKg[i];
        }
    }

    return { massesKg, inverseMassesPerKg, totalSurfaceMassKg };
}

/**
 * Calcula compliance XPBD de estiramiento de arista:
 *   k_edge = K_stretch * (b_e / L_0) [N/m]
 *   alpha_stretch = 1 / k_edge [m/N]
 *   alphaTilde = alpha_stretch / dt_s^2 [kg^-1]
 */
export function computeXpbdEdgeCompliance(
    stretchStiffnessNPerM: number,
    restLengthM: number,
    tributaryWidthM: number,
    substepDtS: number
): { edgeStiffnessNPerM: number; alphaMPerN: number; alphaTildePerKg: number } {
    assertPositiveFinite(stretchStiffnessNPerM, 'stretchStiffnessNPerM');
    assertPositiveFinite(restLengthM, 'restLengthM');
    assertPositiveFinite(tributaryWidthM, 'tributaryWidthM');
    assertPositiveFinite(substepDtS, 'substepDtS');

    const edgeStiffnessNPerM = (stretchStiffnessNPerM * tributaryWidthM) / restLengthM;
    const alphaMPerN = 1 / edgeStiffnessNPerM;
    const alphaTildePerKg = alphaMPerN / (substepDtS * substepDtS);

    return { edgeStiffnessNPerM, alphaMPerN, alphaTildePerKg };
}

/**
 * Selecciona rigidez flexural B [N*m] según signo de curvatura sin promediar caras
 * cuando la tela es ASYMMETRIC (regla V2.6).
 */
export function selectDirectionalBendingRigidityNm(
    spec: BendingRigiditySpec,
    signedAngleDeltaRad: number
): number {
    if (!Number.isFinite(signedAngleDeltaRad)) {
        throw new RangeError('signedAngleDeltaRad debe ser finito');
    }
    if (spec.mode === 'SYMMETRIC') {
        assertPositiveFinite(spec.rigidityNm, 'spec.rigidityNm');
        return spec.rigidityNm;
    }
    assertPositiveFinite(spec.faceUpRigidityNm, 'spec.faceUpRigidityNm');
    assertPositiveFinite(spec.faceDownRigidityNm, 'spec.faceDownRigidityNm');
    return signedAngleDeltaRad >= 0 ? spec.faceUpRigidityNm : spec.faceDownRigidityNm;
}

/**
 * Calcula compliance XPBD de flexión diédrica desde rigidez física B [N*m]:
 *   k_bend_e = 3 * B * l_e^2 / A_12^0 [N*m]
 *   alpha_bend_e = A_12^0 / (3 * B * l_e^2) [N^-1 * m^-1]
 *   alphaTilde = alpha_bend_e / dt_s^2 [kg^-1 * m^-2]
 */
export function computeXpbdBendingCompliance(
    bendingRigidityNm: number,
    hingeLengthM: number,
    combinedTriangleAreaM2: number,
    substepDtS: number
): { discreteStiffnessNm: number; alphaPerNm: number; alphaTildePerKgM2: number } {
    assertPositiveFinite(bendingRigidityNm, 'bendingRigidityNm');
    assertPositiveFinite(hingeLengthM, 'hingeLengthM');
    assertPositiveFinite(combinedTriangleAreaM2, 'combinedTriangleAreaM2');
    assertPositiveFinite(substepDtS, 'substepDtS');

    const discreteStiffnessNm = (3 * bendingRigidityNm * hingeLengthM * hingeLengthM) / combinedTriangleAreaM2;
    const alphaPerNm = 1 / discreteStiffnessNm;
    const alphaTildePerKgM2 = alphaPerNm / (substepDtS * substepDtS);

    return { discreteStiffnessNm, alphaPerNm, alphaTildePerKgM2 };
}

/**
 * Calcula rigidez efectiva por iteración en PBD clásico (Müller et al., 2007):
 *   k' = 1 - (1 - k)^(1 / N_iter)
 */
export function computePbdEffectiveStiffness(stiffness01: number, iterationsPerSubstep: number): number {
    if (!Number.isFinite(stiffness01) || stiffness01 < 0 || stiffness01 > 1) {
        throw new RangeError(`stiffness01 debe estar en [0, 1] (recibido: ${stiffness01})`);
    }
    if (!Number.isInteger(iterationsPerSubstep) || iterationsPerSubstep < 1) {
        throw new RangeError(`iterationsPerSubstep debe ser entero >= 1 (recibido: ${iterationsPerSubstep})`);
    }
    if (stiffness01 === 0) return 0;
    if (stiffness01 === 1) return 1;
    return 1 - Math.pow(1 - stiffness01, 1 / iterationsPerSubstep);
}

