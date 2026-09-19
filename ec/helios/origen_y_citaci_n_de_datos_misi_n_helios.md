# Origen de los Datos y Guía de Citación Académica (Misión Helios)

## 1. Origen de los Datos de Muestra en la Aplicación

Los datos cargados mediante la opción **"Cargar Datos de Muestra (1996-2026)"** tienen una doble naturaleza:

1. **Estructura Sintética / Simulación Didáctica:**
   Para garantizar una carga inmediata y un funcionamiento fluido sin depender de servidores externos en el aula, la aplicación genera algorítmicamente las observaciones.
   * **Modelo Matemático:** Sigue la función oscilatoria sinusoidal del ciclo magnético solar de $\sim 11$ años con ruido estocástico simulado ($val = \text{round}(A + B \cdot \sin(2\pi (t - t_0)/11 - \pi/2) + \epsilon)$).
   * **Representación:** Modela el comportamiento real registrado entre **1996 y 2026** correspondiente a los **Ciclos Solares 23, 24 y el actual Ciclo 25**.

2. **Base Científica de Referencia (Datos Reales):**
   Los parámetros de intensidad, los valles de mínimo solar (como el profundo mínimo de 2008-2009) y los picos de máximo solar están calibrados según los registros históricos oficiales internacionales de la red de observatorios solares en Tierra y espacio.

---

## 2. Instituciones y Fuentes Científicas Oficiales

Si los estudiantes o investigadores necesitan referenciar los datos científicos reales en los que se inspira el laboratorio, las fuentes primarias globales son:

* **SILSO (Sunspot Index and Long-term Solar Observations):**
  Ubicado en el Real Observatorio de Bélgica (Bruselas). Es el centro mundial oficial de recopilación del Número de Wolf / Número Internacional de Manchas Solares desde el siglo XIX.
* **Misión SOHO (Solar and Heliospheric Observatory):**
  Misión conjunta de la **NASA** y la **ESA** lanzada en 1995. Su instrumento **MDI** (Magnetic Doppler Imager) es la fuente histórica de imágenes solares para el periodo 1996–2010.
* **Misión SDO (Solar Dynamics Observatory):**
  Misión de la **NASA** lanzada en 2010. Su instrumento **HMI** (Helioseismic and Magnetic Imager) proporciona las imágenes continuas en luz blanca y magnetogramas desde 2010 hasta la actualidad.

---

## 3. Cómo Citar en Trabajos Académicos (Normas APA 7.ª Edición)

A continuación se presentan los formatos recomendados para incluir en la sección de **Referencias** o **Bibliografía** de informes escolares, ferias de ciencias o proyectos de investigación:

### A. Citación de la Fuente Internacional de Datos Solares (SILSO)
Si se desea citar el registro histórico mundial del Número Internacional de Manchas Solares:

> **SILSO World Data Center.** (1996–2026). *International Sunspot Number Monthly and Daily Total Series (1996–2026)*. Royal Observatory of Belgium, Brussels. https://www.sidc.be/silso/

### B. Citación del Instrumental Satelital (NASA / ESA)
Si se citan las imágenes e instrumental utilizado en el Laboratorio Solar:

> **National Aeronautics and Space Administration [NASA], & European Space Agency [ESA].** (1996–2026). *SOHO/MDI and SDO/HMI Helioseismic and Magnetic Imager Datasets*. NASA Solar Physics Data Center. https://sdo.gsfc.nasa.gov/

### C. Citación de la Herramienta Educativa y Simulador (Misión Helios)
Si se requiere citar la plataforma interactiva y el entorno de laboratorio utilizado en clase:

> **Space Apps Education - Misión Helios.** (2026). *Laboratorio de Análisis de Datos Solares: Módulo interactivo de fusión y visualización de datos (Versión 2.0)* [Aplicación web educativa]. Misión Helios.

---

## 4. Ejemplo de Párrafo de Metodología para el Informe del Alumno

Los estudiantes pueden incluir un texto como el siguiente en la sección de **Metodología** o **Procedimiento** de su informe:

> *"Para el análisis temporal de la actividad solar, se utilizaron registros diarios del Número de Wolf correspondientes al periodo 1996-2026 (Ciclos Solares 23 a 25), procesados mediante el Laboratorio de Análisis de Datos de la Misión Helios. El conjunto de datos modela las series temporales históricas recopiladas por el centro mundial SILSO (Royal Observatory of Belgium) y los observatorios espaciales SOHO (NASA/ESA) y SDO (NASA)."*