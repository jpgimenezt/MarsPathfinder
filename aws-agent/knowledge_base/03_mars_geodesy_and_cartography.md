# Geodesia y Cartografía Marciana para Misiones de Exploración

## 1. Parámetros Fundamentales del Planeta Marte
- **Radio ecuatorial ($a$):** $3,396.19\text{ km}$ ($3,396,190\text{ m}$).
- **Radio polar ($b$):** $3,376.20\text{ km}$ ($3,376,200\text{ m}$).
- **Radio volumétrico medio ($R_M$):** $3,389.50\text{ km}$ ($3,389,500\text{ m}$).
- **Aplanamiento ($f$):** $\approx 0.00589$ ($1/169.78$).
- **Gravedad superficial:** $\approx 3.72\text{ m/s}^2$ (~38% de la gravedad terrestre).
- **Período de rotación (Sol):** 24 horas, 39 minutos, 35.244 segundos.

> **REGLA CRÍTICA DE CÁLCULO:** Nunca utilizar el radio terrestre ($R_T \approx 6,371\text{ km}$) para calcular distancias o trayectos en Marte. Usar siempre el radio medio de Marte $R_M = 3,389.5\text{ km}$. Emplear $R_T$ inflaría erróneamente las distancias en un 88%, comprometiendo la seguridad del suministro de oxígeno y batería del astronauta.

---

## 2. Sistemas de Coordenadas y Referencia Espacial

### 2.1 Latitud: Planetocéntrica vs. Planetográfica
- **Latitud Planetocéntrica ($\phi_{pc}$):** Ángulo medido desde el centro del planeta respecto al plano ecuatorial. Es la más común en productos modernos de exploración robótica (MOLA, USGS, Mars Trek).
- **Latitud Planetográfica ($\phi_{pg}$):** Ángulo entre el vector normal al esferoide de referencia y el plano ecuatorial.
  $$\tan(\phi_{pg}) = \left(\frac{a}{b}\right)^2 \tan(\phi_{pc})$$
- *Recomendación:* Mantener explícita la convención. En AresRoute y Mars Trek se asume latitud planetocéntrica en grados decimales.

### 2.2 Longitud: Dominio y Sentido
- **Convención IAU/NASA estándar:** Longitud Este positiva ($0^\circ$ a $360^\circ$ o $-180^\circ$ a $+180^\circ$).
- El meridiano cero ($0^\circ$) pasa por el cráter Airy-0 en Sinus Meridiani.
- Al cruzar el antimeridiano ($180^\circ$), los cálculos deben normalizar los ángulos:
  $$\Delta \lambda = ((\lambda_2 - \lambda_1 + 180^\circ) \pmod{360^\circ}) - 180^\circ$$

### 2.3 Datum Vertical y Cero de Elevación: El Areoide
- En la Tierra, la elevación se mide respecto al nivel medio del mar (geoide WGS84).
- En Marte, no hay océano. El **Areoide** es una superficie equipotencial gravitatoria calibrada por MOLA y modelos Doppler de seguimiento orbital, fijada tradicionalmente en el radio medio ecuatorial donde la presión atmosférica media histórica rondaba los 6.1 mbar (punto triple del agua).
- Las elevaciones MOLA se expresan en metros sobre o bajo el Areoide.
  - Cima de Olympus Mons: $\approx +21,229\text{ m}$.
  - Fondo de Hellas Planitia: $\approx -8,200\text{ m}$.
  - Suelo de Jezero Crater: $\approx -2,500\text{ m}$.

---

## 3. Ausencia de Red GNSS (GPS) y Campo Magnético
1. **Sin Constelación GPS:** Los astronautas en Marte no disponen de receptores GPS satelitales globales. La navegación en superficie depende de:
   - Navegación relativa al terreno (TRN - Terrain Relative Navigation) usando cámaras ópticas comparadas con ortomapas orbitales (CTX/HiRISE).
   - Odometría visual (cámaras de navegación en el traje o rover) e IMU (unidades de medición inercial).
   - Balizas de radiofrecuencia (UHF/banda S) colocadas en el módulo de descenso / hábitat base.
2. **Sin Campo Magnético Global:** Marte carece de dínamo activo y campo magnético dipolar global (solo remanencias corticales localizadas).
   - **Las brújulas magnéticas convencionales no funcionan en Marte.**
   - La orientación depende de sensores solares, seguimiento estelar diurno/nocturno e IMU giroscópicas.

---

## 4. Fórmula de Gran Círculo (Haversine Marciano)
Para dos puntos $P_1(\phi_1, \lambda_1)$ y $P_2(\phi_2, \lambda_2)$ en coordenadas angulares:
$$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
$$c = 2 \cdot \operatorname{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
$$d = R_M \cdot c \quad (\text{donde } R_M = 3,389,500\text{ m})$$
Para distancias cortas de EVA ($< 10\text{ km}$), el error de la aproximación esférica frente al esferoide elipsoidal es inferior al 0.3%, perfectamente apto para planificación táctica de caminata.
