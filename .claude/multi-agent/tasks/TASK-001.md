id: TASK-001
title: Implement Thermal Lab workspace for Axiom
description: >-
  Quiero que implementes un nuevo workspace de Axiom dedicado a **gradientes térmicos y transferencia de calor**, provisionalmente llamado:

  # Thermal Lab / Thermal Gradients

  Antes de escribir código, **inspecciona completamente el repositorio actual de Axiom** y entiende su arquitectura real. No inventes una arquitectura paralela.

  Axiom está diseñado alrededor de una idea fundamental:

  > **un solo motor matemático, múltiples superficies de exploración.**

  El nuevo workspace debe respetar esto.

  No quiero un simulador físico separado del motor de Axiom. Quiero que el sistema térmico sea otra aplicación de las capacidades matemáticas existentes: expresiones, derivadas, gradientes, Laplaciano, PDE, unidades, evaluación numérica, gráficos y GPU cuando corresponda.

  ---

  # 1. Objetivo matemático

  El sistema debe permitir representar una temperatura como campo escalar:

  $$
  T=T(x,y)
  $$

  $$
  T=T(x,y,z)
  $$

  o, en simulación temporal:

  $$
  T=T(x,y,t)
  $$

  $$
  T=T(x,y,z,t)
  $$

  El usuario debe poder introducir una función de temperatura directamente.

  Ejemplos:

  ```text
  T(x,y) = 20 + 80x
  ```

  ```text
  T(x,y) = 20 + 100 exp(-(x²+y²))
  ```

  ```text
  T(x,y) = 50 + 20sin(x)cos(y)
  ```

  ```text
  T(x,y,t) = 20 + 80exp(-0.2t)sin(x)
  ```

  El sistema debe utilizar el parser/AST/evaluator existente de Axiom.

  **No crear otro parser.**

  **No usar `eval()`.**

  **No duplicar lógica matemática que ya existe en el core.**

  ---

  # 2. El concepto fundamental: campo térmico

  La entidad principal del workspace debe ser un:

  ```text
  ThermalField
  ```

  conceptualmente compuesto por:

  ```text
  temperatureField
  domain
  dimension
  time
  material
  boundaryConditions
  sources
  solver
  visualization
  ```

  Pero adapta los nombres y tipos a las convenciones reales del repositorio.

  El campo de temperatura es un **campo escalar**.

  Por ejemplo:

  $$
  T(x,y)=100-20x+10y
  $$

  A partir de él Axiom debe derivar automáticamente:

  $$
  \nabla T =
  \left(
  \frac{\partial T}{\partial x},
  \frac{\partial T}{\partial y}
  \right)
  $$

  En este caso:

  $$
  \nabla T=(-20,10)
  $$

  El usuario debe poder visualizar ambas cosas:

  ```text
  Temperature field
  Gradient field
  ```

  ---

  # 3. Gradiente térmico

  El gradiente NO debe interpretarse simplemente como otra gráfica.

  Debe representarse matemáticamente como un vector.

  Para 2D:

  $$
  \nabla T =
  \begin{bmatrix}
  \partial T/\partial x \\
  \partial T/\partial y
  \end{bmatrix}
  $$

  Para 3D:

  $$
  \nabla T =
  \begin{bmatrix}
  \partial T/\partial x\\
  \partial T/\partial y\\
  \partial T/\partial z
  \end{bmatrix}
  $$

  El sistema debe calcular:

  ```text
  dT/dx
  dT/dy
  dT/dz
  ```

  cuando corresponda.

  También:

  $$
  |\nabla T|
  $$

  que representa la magnitud del gradiente.

  La interfaz debería mostrar en un punto seleccionado:

  ```text
  Temperature
  Gradient
  Gradient magnitude
  dT/dx
  dT/dy
  dT/dz
  ```

  Por ejemplo:

  ```text
  Point
  x = 0.42
  y = 0.18

  T = 73.41 K

  ∇T =
  (-12.4, 4.8) K/m

  |∇T| =
  13.29 K/m
  ```

  ---

  # 4. Dirección física

  Debe quedar matemáticamente clara la diferencia entre:

  ### Gradiente de temperatura

  $$
  \nabla T
  $$

  apunta hacia la dirección de **máximo incremento de temperatura**.

  ### Flujo térmico

  Para conducción isotrópica:

  $$
  \vec q=-k\nabla T
  $$

  Por tanto, el flujo de calor apunta hacia la dirección opuesta al gradiente.

  El workspace debe permitir activar/desactivar:

  ```text
  Temperature
  Gradient vectors
  Heat-flow vectors
  Isotherms
  ```

  No representar estos vectores de manera arbitraria.

  ---

  # 5. Ley de Fourier

  Implementar explícitamente:

  $$
  \vec q=-k\nabla T
  $$

  donde:

  ```text
  q = heat flux
  k = thermal conductivity
  ∇T = temperature gradient
  ```

  El usuario debe poder introducir la conductividad:

  ```text
  k = 205 W/(m·K)
  ```

  por ejemplo para aluminio.

  El sistema debe calcular automáticamente:

  $$
  q_x=-k\frac{\partial T}{\partial x}
  $$

  $$
  q_y=-k\frac{\partial T}{\partial y}
  $$

  $$
  q_z=-k\frac{\partial T}{\partial z}
  $$

  Debe existir también:

  $$
  |\vec q|
  $$

  como magnitud del flujo térmico.

  ---

  # 6. Unidades

  Este apartado es MUY importante.

  No quiero valores físicos sin dimensiones.

  Utiliza el sistema de unidades existente de Axiom.

  Variables principales:

  ```text
  T
  K
  °C
  ```

  Posición:

  ```text
  m
  ```

  Gradiente:

  ```text
  K/m
  ```

  Conductividad:

  ```text
  W/(m·K)
  ```

  Flujo térmico:

  ```text
  W/m²
  ```

  Densidad:

  ```text
  kg/m³
  $$

  Calor específico:

  ```text
  J/(kg·K)
  $$

  Difusividad térmica:

  ```text
  m²/s
  $$

  Fuente volumétrica de calor:

  ```text
  W/m³
  $$

  Asegúrate de que las operaciones tengan coherencia dimensional.

  No inventes un sistema paralelo de unidades.

  ---

  # 7. Visualización principal

  El workspace debe ser eminentemente visual.

  Para 2D quiero varias capas que puedan activarse individualmente:

  ### A. Temperature heatmap

  Representar:

  $$
  T(x,y)
  $$

  como mapa continuo.

  ### B. Isotherms

  Dibujar curvas:

  $$
  T(x,y)=C
  $$

  para distintos valores de \(C\).

  Estas son las **isotermas**.

  ### C. Gradient vectors

  Mostrar flechas:

  $$
  \nabla T
  $$

  sobre una malla.

  ### D. Heat-flow vectors

  Mostrar:

  $$
  \vec q=-k\nabla T
  $$

  ### E. Gradient magnitude

  Mostrar:

  $$
  |\nabla T|
  $$

  como otro campo visual.

  ### F. Probe

  El usuario debe poder hacer click sobre el dominio.

  Al hacer click:

  ```text
  x
  y
  T(x,y)
  ∇T
  |∇T|
  q
  |q|
  ```

  deben actualizarse.

  Esto debe funcionar como una extensión natural del concepto de "cursor/probe" que Axiom ya utiliza en otros workspaces.

  ---

  # 8. 3D

  En 3D:

  $$
  T(x,y,z)
  $$

  debe poder visualizarse de varias formas.

  Mínimo:

  ```text
  3D temperature surface
  vector field
  slice planes
  ```

  No es necesario comenzar con un volumen 3D extremadamente complejo si la arquitectura existente no lo permite.

  Primero construye una representación eficiente basada en slices / sampling.

  Debe existir:

  ```text
  XY slice
  XZ slice
  YZ slice
  ```

  con posición controlable.

  El objetivo es que un usuario pueda "cortar" el campo y examinar su estructura térmica.

  ---

  # 9. Isotermas

  Implementar visualización de superficies/curvas de temperatura constante.

  En 2D:

  $$
  T(x,y)=C
  $$

  En 3D:

  $$
  T(x,y,z)=C
  $$

  Para el MVP es suficiente implementar curvas de nivel 2D correctamente.

  Si ya existe infraestructura para contour plots, reutilizarla.

  No crear un algoritmo duplicado si el core/renderizador ya tiene algo reutilizable.

  ---

  # 10. Modo ANALYSIS

  El workspace debe tener una sección de análisis matemático.

  Dado:

  $$
  T(x,y)
  $$

  mostrar:

  ```text
  Temperature field
  Gradient
  Gradient magnitude
  Laplacian
  Critical points
  $$

  Debe aprovechar las capacidades existentes del core.

  Por ejemplo:

  $$
  \nabla^2T=
  \frac{\partial^2T}{\partial x^2}
  +
  \frac{\partial^2T}{\partial y^2}
  $$

  Esto es importante porque el Laplaciano conecta directamente el análisis del campo con la ecuación del calor.

  ---

  # 11. Modo STEADY STATE

  Debe existir un modo:

  ```text
  Steady State
  $$

  En este modo el usuario analiza una distribución térmica estacionaria.

  Para conducción homogénea sin generación volumétrica:

  $$
  \nabla^2T=0
  $$

  Por tanto, el sistema puede tratar problemas de Laplace.

  Ejemplo:

  ```text
  Left boundary = 100 °C
  Right boundary = 0 °C
  Top = insulated
  Bottom = insulated
  $$

  y resolver la distribución:

  $$
  T(x,y)
  $$

  en el dominio.

  Esto ya no es solamente "graficar una función".

  Es resolver un problema físico.

  ---

  # 12. Modo TRANSIENT

  Añadir un segundo modo:

  ```text
  Transient
  $$

  Aquí la temperatura cambia con el tiempo.

  La ecuación general debe ser:

  $$
  \rho c_p
  \frac{\partial T}{\partial t}
  =
  \nabla\cdot(k\nabla T)+Q
  $$

  Para material homogéneo con:

  ```text
  k = constant
  ρ = constant
  cp = constant
  $$

  se puede utilizar:

  $$
  \frac{\partial T}{\partial t}
  =
  \alpha\nabla^2T+
  \frac{Q}{\rho c_p}
  $$

  donde:

  $$
  \alpha=\frac{k}{\rho c_p}
  $$

  es la difusividad térmica.

  ---

  # 13. IMPORTANTE: no confundir análisis y simulación

  Separar explícitamente:

  ```text
  FIELD
  $$

  de

  ```text
  SIMULATION
  $$

  ### FIELD

  El usuario proporciona:

  $$
  T(x,y)
  $$

  y Axiom calcula:

  ```text
  gradient
  magnitude
  Laplacian
  heat flux
  isotherms
  $$

  ### SIMULATION

  El usuario proporciona:

  ```text
  initial condition
  boundary conditions
  material
  heat sources
  time
  $$

  y Axiom calcula:

  $$
  T(x,y,t)
  $$

  Esta separación es fundamental.

  ---

  # 14. Solver numérico

  Para el MVP del modo transitorio utiliza un método de diferencias finitas sobre una malla estructurada.

  Por ejemplo:

  ```text
  Nx × Ny
  $$

  representando:

  ```text
  [x0 ... xN]
  [y0 ... yN]
  $$

  Para el Laplaciano 2D:

  $$
  \nabla^2T
  \approx
  \frac{T_{i+1,j}-2T_{i,j}+T_{i-1,j}}{\Delta x^2}
  +
  \frac{T_{i,j+1}-2T_{i,j}+T_{i,j-1}}{\Delta y^2}
  $$

  Implementar el solver como un módulo matemático puro.

  No introducir React dentro del solver.

  Idealmente:

  ```text
  thermal/
      engine/
          field.ts
          gradient.ts
          heatFlux.ts
          finiteDifference.ts
          solver.ts
          boundary.ts
          materials.ts
      store.ts
      components/
  $$

  pero adapta esto a la estructura real de Axiom.

  ---

  # 15. Estabilidad numérica

  Esto es crítico.

  Si utilizas un método explícito, no permitas pasos temporales arbitrariamente grandes.

  Para difusión 2D con diferencias finitas explícitas debe respetarse una condición de estabilidad relacionada con:

  $$
  \alpha\Delta t
  \left(
  \frac{1}{\Delta x^2}
  +
  \frac{1}{\Delta y^2}
  \right)
  \leq
  \frac12
  $$

  Para una malla cuadrada:

  $$
  \Delta t
  \leq
  \frac{\Delta x^2}{4\alpha}
  $$

  Usa margen de seguridad.

  El sistema debe poder mostrar al usuario algo como:

  ```text
  Stable timestep
  Δt ≤ 0.024 s

  Current timestep
  Δt = 0.018 s

  Status
  Stable
  $$

  Si el usuario introduce un timestep inestable:

  ```text
  Warning: unstable timestep
  $$

  No permitas silenciosamente una simulación numéricamente incorrecta.

  Posteriormente puede añadirse un solver implícito como Backward Euler o Crank–Nicolson.

  ---

  # 16. Boundary Conditions

  El sistema debe diseñarse alrededor de condiciones de frontera reales.

  Mínimo:

  ### Dirichlet

  Temperatura fija:

  $$
  T=T_b
  $$

  Ejemplo:

  ```text
  Left = 100 °C
  $$

  ### Neumann

  Flujo térmico especificado:

  $$
  -k\nabla T\cdot n=q_n
  $$

  Ejemplo:

  ```text
  Right flux = 0
  $$

  Esto representa una frontera aislada en el caso:

  $$
  q_n=0
  $$

  ### Robin / Convective

  Como extensión:

  $$
  -k\nabla T\cdot n
  =
  h(T-T_\infty)
  $$

  donde:

  ```text
  h = convection coefficient
  T∞ = ambient temperature
  $$

  Robin puede quedar después del MVP, pero prepara la arquitectura para soportarlo.

  ---

  # 17. Heat sources

  Permitir fuentes volumétricas:

  $$
  Q=Q(x,y,t)
  $$

  Ejemplos:

  ```text
  Q = 1000
  $$

  o

  ```text
  Q(x,y)=10000 exp(-(x²+y²))
  $$

  El sistema debe poder representar:

  ```text
  uniform source
  point-like source
  Gaussian source
  user expression
  $$

  pero no hace falta construir presets artificiales antes de que funcione el modelo general.

  ---

  # 18. Materiales

  Crear un modelo de material desacoplado del renderer.

  Conceptualmente:

  ```text
  Material {
      name
      thermalConductivity
      density
      specificHeat
  }
  $$

  Ejemplos iniciales:

  ```text
  Aluminum
  Copper
  Steel
  Glass
  Water
  Air
  $$

  Los valores deben venir de una fuente técnica documentada, no ser números inventados.

  También permitir:

  ```text
  Custom material
  $$

  para que el usuario introduzca sus propios parámetros.

  ---

  # 19. Conductividad variable

  La arquitectura debe permitir que:

  $$
  k=k(x,y)
  $$

  y eventualmente:

  $$
  k=k(T)
  $$

  aunque inicialmente puedes soportar:

  ```text
  constant k
  $$

  Esto es importante porque la ecuación correcta en el caso general es:

  $$
  \rho c_p\frac{\partial T}{\partial t}
  =
  \nabla\cdot(k\nabla T)+Q
  $$

  No reemplazarla incorrectamente por:

  $$
  k\nabla^2T
  $$

  cuando \(k\) no es constante.

  ---

  # 20. Anisotropía

  No implementarla necesariamente en el MVP, pero deja preparada la abstracción para:

  $$
  \vec q=-\mathbf K\nabla T
  $$

  donde \(\mathbf K\) es un tensor de conductividad térmica.

  Esto permitirá posteriormente investigar materiales anisotrópicos.

  No implementes una versión falsa solamente para "tener la feature".

  ---

  # 21. UI

  La interfaz debe mantener el lenguaje visual actual de Axiom.

  No quiero que parezca un software industrial pesado.

  Debe seguir siendo:

  ```text
  mathematical
  minimal
  experimental
  technical
  clean
  $$

  Layout sugerido:

  ```text
  ┌─────────────────────────────────────────────────────┐
  │ THERMAL LAB                              Run / Pause │
  ├──────────────────────┬──────────────────────────────┤
  │ CONFIGURATION        │                              │
  │                      │                              │
  │ Field / Simulation   │       THERMAL FIELD         │
  │                      │                              │
  │ T(x,y)               │       visualization          │
  │ material             │                              │
  │ boundaries           │                              │
  │ source               │                              │
  │ timestep             │                              │
  │                      │                              │
  ├──────────────────────┤                              │
  │ ANALYSIS             │                              │
  │                      │                              │
  │ ∇T                   │                              │
  │ |∇T|                 │                              │
  │ q                    │                              │
  │ ∇²T                  │                              │
  └──────────────────────┴──────────────────────────────┘
  $$

  No sobrecargar con controles que no sean necesarios.

  ---

  # 22. Interaction

  Debe ser un laboratorio interactivo.

  El usuario debe poder:

  ```text
  drag
  zoom
  pan
  click
  probe
  change parameters
  change material
  change boundary conditions
  play/pause simulation
  change timestep
  reset
  export
  $$

  Cuando cambie un parámetro, la cadena de dependencias debe reaccionar:

  ```text
  parameter
      ↓
  expression / physics
      ↓
  field
      ↓
  gradient
      ↓
  flux
      ↓
  visualization
  $$

  En el modo dinámico:

  ```text
  parameters
      ↓
  solver
      ↓
  T(x,y,t)
      ↓
  gradient
      ↓
  heat flux
      ↓
  visualization
  $$

  ---

  # 23. Performance

  El renderer no debe recalcular innecesariamente el AST en cada pixel.

  Aprovecha el pipeline existente de Axiom.

  Si el campo es adecuado para GPU:

  ```text
  AST
  ↓
  compiled representation
  ↓
  GPU evaluation
  $$

  pero mantén una ruta CPU de referencia para validación.

  Para el solver térmico:

  ```text
  CPU reference implementation
  $$

  primero.

  Después:

  ```text
  GPU acceleration
  $$

  si realmente ofrece una mejora significativa.

  No sacrificar exactitud por una animación más rápida.

  ---

  # 24. Architecture principles

  OBLIGATORIO:

  ### Reutilizar

  ```text
  AST
  parser
  evaluator
  differentiation
  gradient
  Laplacian
  units
  plot infrastructure
  state management
  existing rendering infrastructure
  $$

  cuando exista.

  ### Evitar

  ```text
  duplicate parser
  duplicate math engine
  eval()
  physics hidden inside components
  React-dependent solver
  magic constants
  fake physical behavior
  $$

  El motor térmico debe ser testeable sin montar React.

  ---

  # 25. Numerical vs symbolic calculations

  El sistema debe distinguir:

  ### Symbolic

  Ejemplo:

  $$
  T(x,y)=x^2+y^2
  $$

  y obtener:

  $$
  \nabla T=(2x,2y)
  $$

  ### Numerical

  Evaluar en:

  ```text
  x = 2
  y = 3
  $$

  resultando:

  ```text
  ∇T = (4,6)
  $$

  ### Simulation

  Resolver iterativamente:

  $$
  T^{n+1}=F(T^n)
  $$

  No mezclar estos tres niveles.

  ---

  # 26. Validation examples

  Crear casos conocidos para verificar que el motor funciona.

  ### Case 1 — Linear field

  $$
  T(x,y)=100-10x
  $$

  Debe producir:

  $$
  \nabla T=(-10,0)
  $$

  Por tanto:

  $$
  \vec q=(10k,0)
  $$

  ---

  ### Case 2 — Radial field

  $$
  T(x,y)=T_0+A(x^2+y^2)
  $$

  Debe producir:

  $$
  \nabla T=(2Ax,2Ay)
  $$

  Esto permite comprobar que el campo vectorial apunta radialmente.

  ---

  ### Case 3 — Harmonic field

  $$
  T(x,y)=x^2-y^2
  $$

  Debe cumplirse:

  $$
  \nabla^2T=0
  $$

  por lo que es una solución de Laplace.

  ---

  ### Case 4 — Diffusion

  Partir de un hotspot central.

  Inicial:

  ```text
  T(x,y,0) = Gaussian
  $$

  y observar difusión temporal.

  La temperatura debe suavizarse progresivamente sin que aparezcan oscilaciones físicas artificiales cuando los parámetros están dentro del régimen estable.

  ---

  # 27. Tests

  Crear tests unitarios para:

  ```text
  gradient
  gradient magnitude
  heat flux
  Laplacian
  thermal diffusivity
  boundary conditions
  finite differences
  steady-state solver
  transient solver
  unit validation
  stability condition
  $$

  Agregar tests analíticos con soluciones conocidas.

  Por ejemplo:

  ```text
  T(x,y)=x²+y²
  gradient=(2x,2y)
  Laplacian=4
  $$

  El error numérico debe ser medible.

  No limitarse a:

  ```text
  expect(result).toBeDefined()
  $$

  Quiero validación matemática real.

  ---

  # 28. Error metrics

  Cuando corresponda, mostrar:

  ```text
  L∞ error
  L2 error
  relative error
  $$

  contra una solución analítica conocida.

  Esto convierte Thermal Lab en una herramienta de experimentación matemática y no simplemente en una animación.

  ---

  # 29. Notebook integration

  Considera cómo este workspace puede integrarse posteriormente con el Notebook de Axiom.

  Idealmente una experiencia como:

  ```text
  Cell 1:
  T(x,y) = ...

  Cell 2:
  ∇T = gradient(T)

  Cell 3:
  q = -k∇T

  Cell 4:
  visualize(q)
  $$

  No necesariamente implementarlo en la primera iteración, pero la arquitectura debe evitar impedirlo.

  ---

  # 30. Export

  Preparar posibilidad de exportar:

  ```text
  temperature grid
  gradient vectors
  heat flux
  simulation frame
  parameters
  $$

  JSON / CSV cuando sea apropiado.

  Especialmente útil para:

  ```text
  (x, y, T, dTdx, dTdy, |gradT|, qx, qy)
  $$

  ---

  # 31. MVP

  NO intentes implementar toda la física en una sola iteración.

  El MVP debe ser:

  ### Phase 1

  ```text
  2D
  T(x,y)
  symbolic gradient
  gradient magnitude
  Laplacian
  heat flux
  material with constant k
  heatmap
  isotherms
  gradient vectors
  probe
  $$

  ### Phase 2

  ```text
  steady-state PDE
  Dirichlet boundaries
  Neumann boundaries
  finite differences
  $$

  ### Phase 3

  ```text
  transient simulation
  ρ
  cp
  α
  heat sources
  time controls
  stability checks
  $$

  ### Phase 4

  ```text
  Robin boundaries
  variable k
  3D
  GPU acceleration
  anisotropic conductivity
  advanced solvers
  $$

  No saltarse directamente al Phase 4.

  ---

  # 32. UX philosophy

  El workspace debe enseñar la matemática mientras la utiliza.

  Cuando el usuario activa:

  ```text
  Gradient
  $$

  debe poder ver:

  $$
  \nabla T=
  \left(
  \frac{\partial T}{\partial x},
  \frac{\partial T}{\partial y}
  \right)
  $$

  Cuando activa:

  ```text
  Heat Flux
  $$

  debe aparecer:

  $$
  \vec q=-k\nabla T
  $$

  Cuando activa:

  ```text
  Heat Equation
  $$

  debe aparecer:

  $$
  \rho c_p\frac{\partial T}{\partial t}
  =
  \nabla\cdot(k\nabla T)+Q
  $$

  Esto debe estar integrado visualmente, no escondido en documentación.

  ---

  # 33. Critical requirement

  No construyas un sistema que "parezca térmico" pero que no resuelva las ecuaciones que afirma resolver.

  Por ejemplo, NO hacer:

  ```text
  temperature = interpolation()
  color = fakeHeatMap()
  particles = visualEffect()
  $$

  y llamarlo thermal simulation.

  La visualización debe ser una consecuencia de:

  $$
  T
  \rightarrow
  \nabla T
  \rightarrow
  q
  $$

  y, cuando corresponda:

  $$
  T_{t+\Delta t}
  =
  \text{PDE solver}(T_t)
  $$

  ---

  # 34. Axiom identity

  Thermal Lab debe sentirse como parte nativa de Axiom.

  La filosofía debe ser:

  > **Axiom does not merely graph thermal data. It exposes the mathematics governing thermal fields.**

  La herramienta debe servir tanto para:

  ```text
  calculus
  $$

  como para:

  ```text
  physics
  $$

  sin dejar de ser un simulador matemático.

  ---

  # 35. Deliverables

  Después de inspeccionar el repositorio:

  1. Identifica exactamente dónde integrar el nuevo workspace.
  2. Identifica qué módulos existentes pueden reutilizarse.
  3. Implementa primero el núcleo matemático independiente de React.
  4. Implementa tests.
  5. Implementa la interfaz.
  6. Integra el workspace al sistema de navegación/workspaces.
  7. Ejecuta el test suite existente.
  8. Corrige regresiones.
  9. Verifica TypeScript y lint.
  10. Documenta las decisiones matemáticas y numéricas.

  Antes de terminar, dame un resumen con:

  ```text
  Files created
  Files modified
  Existing modules reused
  Mathematical model
  Numerical method
  Tests added
  Known limitations
  Future extensions
  $$

  No inventes resultados de tests: ejecútalos realmente.

  La prioridad es:

  **mathematical correctness > architectural consistency > numerical stability > performance > visual polish.**
status: BACKLOG
priority: HIGH
classification:
  tipo: feature
  superficie: frontend
  riesgo: ninguno
assigned_agent: orchestrator
dependencies: []
acceptance_criteria:
  - { id: AC1, text: "Create Thermal Lab workspace with 2D temperature field input and symbolic gradient calculation", verify: "User can input T(x,y) and see ∇T calculated symbolically", met: false, evidence: null }
  - { id: AC2, text: "Implement temperature heatmap and isotherms visualization", verify: "Heatmap and contour lines for temperature field are displayed", met: false, evidence: null }
  - { id: AC3, text: "Add gradient magnitude and heat flux calculations with units", verify: "∇T magnitude and q = -k∇T are computed and displayed with correct units", met: false, evidence: null }
  - { id: AC4, text: "Include probe functionality to inspect point values", verify: "Clicking on domain shows T, ∇T, |∇T|, q, |q| at cursor position", met: false, evidence: null }
  - { id: AC5, text: "Implement steady-state solver for Laplace equation with Dirichlet/Neumann boundaries", verify: "Solves ∇²T=0 with boundary conditions and shows temperature distribution", met: false, evidence: null }
files: []
risks: []
security_required: false
red_team_required: false
appsec_required: false
pipeline: [planner, builder, optimizer, qa, appsec, red-team, orchestrator]
iteration: 0
findings: []
created: 2026-10-01
updated: 2026-10-01