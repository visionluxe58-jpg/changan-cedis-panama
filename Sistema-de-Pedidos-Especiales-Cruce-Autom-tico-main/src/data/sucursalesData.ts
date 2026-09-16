export interface PersonalSucursal {
  id: string;
  nombre: string;
  cargo: string;
  area: 'Mostrador' | 'Chapistería' | 'Taller' | 'Repuestos' | 'Garantías';
  correo?: string;
}

export interface ConfiguracionSucursal {
  id: string;
  nombre: string;
  prefijo: string;
  tipoEquipo: 'INDIVIDUAL' | 'MULTIPLE';
  badge: string;
  canalDefecto: string;
  // Para sucursales individuales
  asesorFijo?: PersonalSucursal;
  // Para sucursales con equipo múltiple
  equipo?: PersonalSucursal[];
  descripcionEquipo?: string;
}

export const SUCURSALES_PORTAL: ConfiguracionSucursal[] = [
  {
    id: 'costa_verde',
    nombre: 'Costa Verde',
    prefijo: 'CV',
    tipoEquipo: 'INDIVIDUAL',
    badge: 'Más alto',
    canalDefecto: 'Taller',
    asesorFijo: {
      id: 'usr_cv_01',
      nombre: 'Arquímedes Jordan',
      cargo: 'Asesor Técnico de Servicio',
      area: 'Taller',
      correo: 'taller.costaverde@changanpanama.com'
    }
  },
  {
    id: 'calle_50',
    nombre: 'Calle 50',
    prefijo: 'C50',
    tipoEquipo: 'MULTIPLE',
    badge: 'Equipo Múltiple',
    canalDefecto: 'Taller',
    descripcionEquipo: 'Edilson, Valeria, Carlos, Roberto. Te preguntará quién eres para reconocer tu área',
    equipo: [
      {
        id: 'usr_c50_01',
        nombre: 'Edilson Uribe',
        cargo: 'Asesor Senior de Servicio',
        area: 'Taller',
        correo: 'servicio.c50@changanpanama.com'
      },
      {
        id: 'usr_c50_02',
        nombre: 'Valeria Castillo',
        cargo: 'Especialista en Garantías Oficiales',
        area: 'Garantías',
        correo: 'garantias.c50@changanpanama.com'
      },
      {
        id: 'usr_c50_03',
        nombre: 'Carlos Mendoza',
        cargo: 'Ventas de Mostrador y Flotas',
        area: 'Mostrador',
        correo: 'repuestos.c50@changanpanama.com'
      },
      {
        id: 'usr_c50_04',
        nombre: 'Roberto González',
        cargo: 'Facturador y Supervisor de Taller',
        area: 'Taller',
        correo: 'taller.c50@changanpanama.com'
      }
    ]
  },
  {
    id: 'tumba_muerto',
    nombre: 'Tumba Muerto',
    prefijo: 'TM',
    tipoEquipo: 'INDIVIDUAL',
    badge: 'Más alto',
    canalDefecto: 'Taller',
    asesorFijo: {
      id: 'usr_tm_01',
      nombre: 'Ulises Barría',
      cargo: 'Asesor de Servicio y Colisión',
      area: 'Taller',
      correo: 'repuestos.tm@changanpanama.com'
    }
  },
  {
    id: 'chiriqui',
    nombre: 'Chiriquí',
    prefijo: 'CH',
    tipoEquipo: 'INDIVIDUAL',
    badge: 'Más alto',
    canalDefecto: 'Taller',
    asesorFijo: {
      id: 'usr_ch_01',
      nombre: 'Nivardo Gutiérrez',
      cargo: 'Asesor Integral Chiriquí',
      area: 'Taller',
      correo: 'sucursal.chiriqui@changanpanama.com'
    }
  },
  {
    id: 'santa_maria',
    nombre: 'Santa María',
    prefijo: 'SM',
    tipoEquipo: 'INDIVIDUAL',
    badge: 'Mostrador',
    canalDefecto: 'Mostrador',
    asesorFijo: {
      id: 'usr_sm_01',
      nombre: 'Marcos Vega',
      cargo: 'Asesor de Mostrador y Repuestos',
      area: 'Mostrador',
      correo: 'mostrador.santamaria@changanpanama.com'
    }
  },
  {
    id: 'villa_lucre',
    nombre: 'Villa Lucre',
    prefijo: 'VL',
    tipoEquipo: 'MULTIPLE',
    badge: 'Equipo Múltiple',
    canalDefecto: 'Mostrador',
    descripcionEquipo: 'Leidys, Edwin, Pedro, Luis, Daniel. Te preguntará quién eres para reconocer tu área',
    equipo: [
      {
        id: 'usr_vl_01',
        nombre: 'Leidys Pérez',
        cargo: 'Ventas Mostrador',
        area: 'Mostrador',
        correo: 'repuestos.vl@changanpanama.com'
      },
      {
        id: 'usr_vl_02',
        nombre: 'Edwin Blanco',
        cargo: 'Consultor de estructuras metálicas',
        area: 'Chapistería',
        correo: 'chapisteria.vl@changanpanama.com'
      },
      {
        id: 'usr_vl_03',
        nombre: 'Pedro',
        cargo: 'Facturador de Taller',
        area: 'Taller',
        correo: 'taller.vl@changanpanama.com'
      },
      {
        id: 'usr_vl_04',
        nombre: 'Luis Rodríguez',
        cargo: 'Supervisor de Repuestos',
        area: 'Repuestos',
        correo: 'supervisor.repuestos@changanpanama.com'
      },
      {
        id: 'usr_vl_05',
        nombre: 'Daniel Saldaña',
        cargo: 'Gerente de Repuestos',
        area: 'Repuestos',
        correo: 'gerencia.repuestos@changanpanama.com'
      }
    ]
  }
];

export interface ModeloVehiculoChangan {
  nombre: string;
  categoria: 'SUV' | 'Sedán' | 'Eléctrico / Híbrido' | 'Pickup' | 'Comercial';
  anosCompatibles: string;
  motor?: string;
  descripcion?: string;
}

export const CATALOGO_MODELOS_CHANGAN: ModeloVehiculoChangan[] = [
  // --- SUV ---
  { nombre: 'CS15', categoria: 'SUV', anosCompatibles: '2018-2026', motor: '1.5L DVVT (105 HP)', descripcion: 'SUV compacto urbano' },
  { nombre: 'CS35 Normal', categoria: 'SUV', anosCompatibles: '2015-2020', motor: '1.6L BlueCore', descripcion: 'SUV primera generación' },
  { nombre: 'CS35 Plus 2020-2022 (Modelo QUATE)', categoria: 'SUV', anosCompatibles: '2020-2022', motor: '1.6L GDI', descripcion: 'Modelo QUATE' },
  { nombre: 'CS35 Plus 2023-2024', categoria: 'SUV', anosCompatibles: '2019-2026', motor: '1.4L Turbo BlueCore (158 HP)', descripcion: 'SUV de alta demanda en Panamá' },
  { nombre: 'CS35 Plus Turbo', categoria: 'SUV', anosCompatibles: '2021-2026', motor: '1.4T DCT', descripcion: 'Versión deportiva turbo' },
  { nombre: 'CS35 Plus MAX', categoria: 'SUV', anosCompatibles: '2021-2026', motor: '1.4T DCT', descripcion: 'Línea deportiva MAX' },
  { nombre: 'CS55 Normal', categoria: 'SUV', anosCompatibles: '2018-2021', motor: '1.5T', descripcion: 'SUV mediano primera generación' },
  { nombre: 'CS55 Plus', categoria: 'SUV', anosCompatibles: '2021-2026', motor: '1.5L Turbo BlueCore (185 HP)', descripcion: 'SUV mediano insignia' },
  { nombre: 'CS55 Plus 2da Gen', categoria: 'SUV', anosCompatibles: '2022-2026', motor: '1.5T 7-DCT', descripcion: 'Nueva generación' },
  { nombre: 'CS55 Plus Q5', categoria: 'SUV', anosCompatibles: '2022-2026', motor: '1.5T 7-DCT', descripcion: 'Edición Q5' },
  { nombre: 'CS55 Plus 2026-2027', categoria: 'SUV', anosCompatibles: '2026-2027', motor: '1.5T BlueCore NE', descripcion: 'Línea 2026-2027' },
  { nombre: 'CS75 Plus', categoria: 'SUV', anosCompatibles: '2020-2026', motor: '2.0L Turbo BlueCore (229 HP)', descripcion: 'SUV premium 5 pasajeros' },
  { nombre: 'CS85 Coupe', categoria: 'SUV', anosCompatibles: '2019-2025', motor: '2.0T Aisin 8AT', descripcion: 'SUV Coupe deportivo' },
  { nombre: 'CS95', categoria: 'SUV', anosCompatibles: '2018-2025', motor: '2.0T AWD 7 Pasajeros', descripcion: 'SUV insignia 7 pasajeros' },
  { nombre: 'Oshan X7 Plus', categoria: 'SUV', anosCompatibles: '2021-2025', motor: '1.5L Turbo BlueCore', descripcion: 'Línea ejecutiva Oshan 7 pasajeros' },
  { nombre: 'UNI-T', categoria: 'SUV', anosCompatibles: '2021-2026', motor: '1.5L Turbo BlueCore (180 HP)', descripcion: 'Cross-SUV vanguardista' },
  { nombre: 'UNI-K', categoria: 'SUV', anosCompatibles: '2021-2026', motor: '2.0L Turbo AWD Aisin 8AT', descripcion: 'SUV insignia de lujo AWD' },

  // --- SEDANES ---
  { nombre: 'Alsvin', categoria: 'Sedán', anosCompatibles: '2020-2026', motor: '1.4L / 1.5L DCT BlueCore', descripcion: 'Sedán de alta rotación de repuestos' },
  { nombre: 'Alsvin Plus', categoria: 'Sedán', anosCompatibles: '2021-2026', motor: '1.5L BlueCore', descripcion: 'Sedán confort' },
  { nombre: 'UNI-V', categoria: 'Sedán', anosCompatibles: '2022-2026', motor: '1.5T / 2.0T Fastback', descripcion: 'Sedán deportivo Fastback' },
  { nombre: 'Eado / Eado Plus', categoria: 'Sedán', anosCompatibles: '2020-2026', motor: '1.4T / 1.6L BlueCore', descripcion: 'Sedán ejecutivo' },

  // --- PICKUPS ---
  { nombre: 'Hunter Pickup (4x2 / 4x4)', categoria: 'Pickup', anosCompatibles: '2020-2026', motor: '1.9L Turbo Diesel Isuzu Tech (150 HP)', descripcion: 'Pickup de trabajo pesado y flotas' },
  { nombre: 'Hunter 4x4 Diesel', categoria: 'Pickup', anosCompatibles: '2020-2026', motor: '1.9T Diesel 4x4', descripcion: 'Versión 4x4 Off-Road' },
  { nombre: 'Kaicene F70', categoria: 'Pickup', anosCompatibles: '2020-2026', motor: '2.5T Diesel Isuzu Tech', descripcion: 'Pickup plataforma compartida' },

  // --- ELÉCTRICOS / HÍBRIDOS (NUEVAS ENERGÍAS) ---
  { nombre: 'Hunter REEV / Híbrido', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2024-2026', motor: 'Eléctrico Rango Extendido (EREV) Dual Motor', descripcion: 'Primera pickup eléctrica con extensor de rango' },
  { nombre: 'Deepal S05', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2023-2026', motor: '100% Eléctrico / EREV', descripcion: 'SUV eléctrico inteligente' },
  { nombre: 'Deepal S07', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2023-2026', motor: '100% Eléctrico / EREV (620 km)', descripcion: 'SUV deportivo eléctrico' },
  { nombre: 'Deepal L07 / SL03', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2023-2026', motor: '100% Eléctrico / EREV', descripcion: 'Sedán deportivo eléctrico' },
  { nombre: 'Deepal G318', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2025-2027', motor: 'Dual Motor EREV Off-Road', descripcion: 'SUV todoterreno todocamino' },
  { nombre: 'Avatr 11', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2024-2026', motor: 'Dual Motor AWD 578 HP (Huawei Inside)', descripcion: 'SUV ultra premium eléctrico' },
  { nombre: 'Eado EV460', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2021-2026', motor: '100% Eléctrico (Batería 52.5 kWh)', descripcion: 'Sedán 100% eléctrico' },
  { nombre: 'Lumin', categoria: 'Eléctrico / Híbrido', anosCompatibles: '2022-2026', motor: '100% Eléctrico Urbano', descripcion: 'City car eléctrico' },

  // --- COMERCIALES ---
  { nombre: 'Honor S', categoria: 'Comercial', anosCompatibles: '2018-2025', motor: '1.5L (7-8 Pasajeros)', descripcion: 'Minivan pasajeros y carga' },
  { nombre: 'M60', categoria: 'Comercial', anosCompatibles: '2018-2025', motor: '1.5L Gasolina (7 Pasajeros)', descripcion: 'Vehículo comercial y transporte' },
  { nombre: 'Star5', categoria: 'Comercial', anosCompatibles: '2017-2026', motor: '1.2L / 1.5L Carga Ligera', descripcion: 'Camión liviano de carga' },
  { nombre: 'Star Truck / M201', categoria: 'Comercial', anosCompatibles: '2017-2026', motor: '1.2L / 1.5L Chasis Cabina', descripcion: 'Camión comercial chasis' }
];

export const CATEGORIAS_MODELOS: Array<'SUV' | 'Sedán' | 'Eléctrico / Híbrido' | 'Pickup' | 'Comercial'> = [
  'SUV',
  'Sedán',
  'Pickup',
  'Eléctrico / Híbrido',
  'Comercial'
];

export const MODELOS_VEHICULOS_CHANGAN = CATALOGO_MODELOS_CHANGAN.map(m => m.nombre);
