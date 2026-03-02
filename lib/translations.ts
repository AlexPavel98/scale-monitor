export type TranslationKeys = {
  common: {
    appName: string
    save: string
    cancel: string
    delete: string
    edit: string
    add: string
    search: string
    filter: string
    loading: string
    noData: string
    actions: string
    confirm: string
    confirmDelete: string
    close: string
    yes: string
    no: string
    back: string
    export: string
    print: string
    date: string
    time: string
    from: string
    to: string
    total: string
    status: string
    notes: string
    all: string
    today: string
    kg: string
    m3: string
  }
  nav: {
    dashboard: string
    weighing: string
    history: string
    vehicles: string
    customers: string
    products: string
    cards: string
    statistics: string
    waste: string
    debtors: string
    settings: string
  }
  login: {
    title: string
    email: string
    password: string
    signIn: string
    error: string
  }
  dashboard: {
    title: string
    todayWeighings: string
    todayTonnage: string
    pendingWeighings: string
    todayVolume: string
    recentWeighings: string
    dailyTonnage: string
  }
  weighing: {
    title: string
    newWeighing: string
    pending: string
    cardNumber: string
    plateNumber: string
    carrier: string
    customer: string
    product: string
    direction: string
    directionIn: string
    directionOut: string
    weight: string
    firstWeight: string
    secondWeight: string
    netWeight: string
    weigh: string
    complete: string
    deliveryNote: string
    workplace: string
    caseNumber: string
    elapsed: string
    volume: string
    tare: string
    selectVehicle: string
    selectCustomer: string
    selectProduct: string
    manualEntry: string
    liveScale: string
    captureWeight: string
    noConnection: string
    stable: string
    unstable: string
  }
  vehicles: {
    title: string
    plateNumber: string
    carrier: string
    address: string
    phone: string
    tareWeight: string
    addVehicle: string
    editVehicle: string
  }
  customers: {
    title: string
    customerNumber: string
    name: string
    address: string
    email: string
    cvr: string
    pNumber: string
    pinCode: string
    addCustomer: string
    editCustomer: string
  }
  products: {
    title: string
    productNumber: string
    name: string
    density: string
    control: string
    addProduct: string
    editProduct: string
  }
  cards: {
    title: string
    cardNumber: string
    vehicle: string
    customer: string
    product: string
    workplace: string
    caseNumber: string
    addCard: string
    editCard: string
  }
  history: {
    title: string
    weighingNumber: string
    dateRange: string
    completed: string
    first: string
    cancelled: string
  }
  statistics: {
    title: string
    totalWeight: string
    totalVolume: string
    totalCount: string
    byProduct: string
    byCustomer: string
    exportCsv: string
    exportPdf: string
  }
  waste: {
    title: string
    facility: string
    reportingYear: string
    municipality: string
    wasteCode: string
    method: string
    generateReport: string
    submitReport: string
    draft: string
    submitted: string
  }
  debtors: {
    title: string
    subtotal: string
    grandTotal: string
  }
  settings: {
    title: string
    companyInfo: string
    companyName: string
    address: string
    ticketConfig: string
    controlFields: string
    scaleConfig: string
    comPort: string
    baudRate: string
  }
  ticket: {
    weighingReceipt: string
    weighingNo: string
    date: string
    time: string
    vehicle: string
    carrier: string
    customer: string
    product: string
    firstWeighing: string
    secondWeighing: string
    net: string
    direction: string
    operator: string
    notes: string
  }
}

const da: TranslationKeys = {
  common: {
    appName: 'Scale Monitor',
    save: 'Gem',
    cancel: 'Annuller',
    delete: 'Slet',
    edit: 'Rediger',
    add: 'Tilf\u00f8j',
    search: 'S\u00f8g',
    filter: 'Filter',
    loading: 'Indl\u00e6ser...',
    noData: 'Ingen data',
    actions: 'Handlinger',
    confirm: 'Bekr\u00e6ft',
    confirmDelete: 'Er du sikker p\u00e5, at du vil slette dette?',
    close: 'Luk',
    yes: 'Ja',
    no: 'Nej',
    back: 'Tilbage',
    export: 'Eksporter',
    print: 'Udskriv',
    date: 'Dato',
    time: 'Tid',
    from: 'Fra',
    to: 'Til',
    total: 'Total',
    status: 'Status',
    notes: 'Bem\u00e6rkninger',
    all: 'Alle',
    today: 'I dag',
    kg: 'kg',
    m3: 'm\u00b3',
  },
  nav: {
    dashboard: 'Dashboard',
    weighing: 'Vejning',
    history: 'Historik',
    vehicles: 'Biler',
    customers: 'Kunder',
    products: 'Varer',
    cards: 'Kort',
    statistics: 'Statistik',
    waste: 'Affald',
    debtors: 'Debitorer',
    settings: 'Indstillinger',
  },
  login: {
    title: 'Log ind',
    email: 'E-mail',
    password: 'Adgangskode',
    signIn: 'Log ind',
    error: 'Ugyldige loginoplysninger',
  },
  dashboard: {
    title: 'Dashboard',
    todayWeighings: 'Vejninger i dag',
    todayTonnage: 'Tonnage i dag',
    pendingWeighings: 'Afventende',
    todayVolume: 'Volumen i dag',
    recentWeighings: 'Seneste vejninger',
    dailyTonnage: 'Daglig tonnage',
  },
  weighing: {
    title: 'Vejning',
    newWeighing: 'Ny vejning',
    pending: 'Afventende',
    cardNumber: 'Kortnummer',
    plateNumber: 'Nummerplade',
    carrier: 'Vognmand',
    customer: 'Kunde',
    product: 'Vare',
    direction: 'Retning',
    directionIn: 'Indvejning',
    directionOut: 'Udvejning',
    weight: 'V\u00e6gt',
    firstWeight: '1. vejning',
    secondWeight: '2. vejning',
    netWeight: 'Netto',
    weigh: 'Vej',
    complete: 'Fuldf\u00f8r',
    deliveryNote: 'F\u00f8lgeseddel',
    workplace: 'Arbejdssted',
    caseNumber: 'Sagsnr.',
    elapsed: 'Tid',
    volume: 'Volumen',
    tare: 'Tara',
    selectVehicle: 'V\u00e6lg bil',
    selectCustomer: 'V\u00e6lg kunde',
    selectProduct: 'V\u00e6lg vare',
    manualEntry: 'Manuel indtastning',
    liveScale: 'Live v\u00e6gt',
    captureWeight: 'Fang v\u00e6gt',
    noConnection: 'Ingen forbindelse',
    stable: 'Stabil',
    unstable: 'Ustabil',
  },
  vehicles: {
    title: 'Biler',
    plateNumber: 'Nummerplade',
    carrier: 'Vognmand',
    address: 'Adresse',
    phone: 'Telefon',
    tareWeight: 'Tara (kg)',
    addVehicle: 'Tilf\u00f8j bil',
    editVehicle: 'Rediger bil',
  },
  customers: {
    title: 'Kunder',
    customerNumber: 'Kundenr.',
    name: 'Navn',
    address: 'Adresse',
    email: 'E-mail',
    cvr: 'CVR-nr.',
    pNumber: 'P-nr.',
    pinCode: 'PIN-kode',
    addCustomer: 'Tilf\u00f8j kunde',
    editCustomer: 'Rediger kunde',
  },
  products: {
    title: 'Varer',
    productNumber: 'Varenr.',
    name: 'Varenavn',
    density: 'Fylde (kg/m\u00b3)',
    control: 'Kontrol',
    addProduct: 'Tilf\u00f8j vare',
    editProduct: 'Rediger vare',
  },
  cards: {
    title: 'Kort',
    cardNumber: 'Kortnr.',
    vehicle: 'Bil',
    customer: 'Kunde',
    product: 'Vare',
    workplace: 'Arbejdssted',
    caseNumber: 'Sagsnr.',
    addCard: 'Tilf\u00f8j kort',
    editCard: 'Rediger kort',
  },
  history: {
    title: 'Historik',
    weighingNumber: 'Vejenr.',
    dateRange: 'Datov\u00e6lg',
    completed: 'Fuldf\u00f8rt',
    first: 'F\u00f8rste',
    cancelled: 'Annulleret',
  },
  statistics: {
    title: 'Statistik',
    totalWeight: 'Total v\u00e6gt',
    totalVolume: 'Total volumen',
    totalCount: 'Antal',
    byProduct: 'Per vare',
    byCustomer: 'Per kunde',
    exportCsv: 'Eksporter CSV',
    exportPdf: 'Eksporter PDF',
  },
  waste: {
    title: 'Affaldssystem',
    facility: 'Anl\u00e6g',
    reportingYear: 'Indberetnings\u00e5r',
    municipality: 'Kommune',
    wasteCode: 'Affaldskode',
    method: 'Metode',
    generateReport: 'Generer rapport',
    submitReport: 'Indsend rapport',
    draft: 'Kladde',
    submitted: 'Indsendt',
  },
  debtors: {
    title: 'Debitorer',
    subtotal: 'Subtotal',
    grandTotal: 'I alt',
  },
  settings: {
    title: 'Indstillinger',
    companyInfo: 'Firmainformation',
    companyName: 'Firmanavn',
    address: 'Adresse',
    ticketConfig: 'Bonindstillinger',
    controlFields: 'Kontrolfelter',
    scaleConfig: 'V\u00e6gtindstillinger',
    comPort: 'COM-port',
    baudRate: 'Baudhastighed',
  },
  ticket: {
    weighingReceipt: 'Vejeseddel',
    weighingNo: 'Vejenr.',
    date: 'Dato',
    time: 'Tid',
    vehicle: 'Bil',
    carrier: 'Vognmand',
    customer: 'Kunde',
    product: 'Vare',
    firstWeighing: '1. vejning',
    secondWeighing: '2. vejning',
    net: 'Netto',
    direction: 'Retning',
    operator: 'Operat\u00f8r',
    notes: 'Bem\u00e6rkninger',
  },
}

const en: TranslationKeys = {
  common: {
    appName: 'Scale Monitor',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    loading: 'Loading...',
    noData: 'No data',
    actions: 'Actions',
    confirm: 'Confirm',
    confirmDelete: 'Are you sure you want to delete this?',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    back: 'Back',
    export: 'Export',
    print: 'Print',
    date: 'Date',
    time: 'Time',
    from: 'From',
    to: 'To',
    total: 'Total',
    status: 'Status',
    notes: 'Notes',
    all: 'All',
    today: 'Today',
    kg: 'kg',
    m3: 'm\u00b3',
  },
  nav: {
    dashboard: 'Dashboard',
    weighing: 'Weighing',
    history: 'History',
    vehicles: 'Vehicles',
    customers: 'Customers',
    products: 'Products',
    cards: 'Cards',
    statistics: 'Statistics',
    waste: 'Waste',
    debtors: 'Debtors',
    settings: 'Settings',
  },
  login: {
    title: 'Sign In',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign In',
    error: 'Invalid credentials',
  },
  dashboard: {
    title: 'Dashboard',
    todayWeighings: 'Weighings today',
    todayTonnage: 'Tonnage today',
    pendingWeighings: 'Pending',
    todayVolume: 'Volume today',
    recentWeighings: 'Recent weighings',
    dailyTonnage: 'Daily tonnage',
  },
  weighing: {
    title: 'Weighing',
    newWeighing: 'New weighing',
    pending: 'Pending',
    cardNumber: 'Card number',
    plateNumber: 'Plate number',
    carrier: 'Carrier',
    customer: 'Customer',
    product: 'Product',
    direction: 'Direction',
    directionIn: 'Weigh in',
    directionOut: 'Weigh out',
    weight: 'Weight',
    firstWeight: '1st weighing',
    secondWeight: '2nd weighing',
    netWeight: 'Net',
    weigh: 'Weigh',
    complete: 'Complete',
    deliveryNote: 'Delivery note',
    workplace: 'Workplace',
    caseNumber: 'Case no.',
    elapsed: 'Time',
    volume: 'Volume',
    tare: 'Tare',
    selectVehicle: 'Select vehicle',
    selectCustomer: 'Select customer',
    selectProduct: 'Select product',
    manualEntry: 'Manual entry',
    liveScale: 'Live scale',
    captureWeight: 'Capture weight',
    noConnection: 'No connection',
    stable: 'Stable',
    unstable: 'Unstable',
  },
  vehicles: {
    title: 'Vehicles',
    plateNumber: 'Plate number',
    carrier: 'Carrier',
    address: 'Address',
    phone: 'Phone',
    tareWeight: 'Tare (kg)',
    addVehicle: 'Add vehicle',
    editVehicle: 'Edit vehicle',
  },
  customers: {
    title: 'Customers',
    customerNumber: 'Customer no.',
    name: 'Name',
    address: 'Address',
    email: 'Email',
    cvr: 'CVR no.',
    pNumber: 'P no.',
    pinCode: 'PIN code',
    addCustomer: 'Add customer',
    editCustomer: 'Edit customer',
  },
  products: {
    title: 'Products',
    productNumber: 'Product no.',
    name: 'Product name',
    density: 'Density (kg/m\u00b3)',
    control: 'Control',
    addProduct: 'Add product',
    editProduct: 'Edit product',
  },
  cards: {
    title: 'Cards',
    cardNumber: 'Card no.',
    vehicle: 'Vehicle',
    customer: 'Customer',
    product: 'Product',
    workplace: 'Workplace',
    caseNumber: 'Case no.',
    addCard: 'Add card',
    editCard: 'Edit card',
  },
  history: {
    title: 'History',
    weighingNumber: 'Weighing no.',
    dateRange: 'Date range',
    completed: 'Completed',
    first: 'First',
    cancelled: 'Cancelled',
  },
  statistics: {
    title: 'Statistics',
    totalWeight: 'Total weight',
    totalVolume: 'Total volume',
    totalCount: 'Count',
    byProduct: 'By product',
    byCustomer: 'By customer',
    exportCsv: 'Export CSV',
    exportPdf: 'Export PDF',
  },
  waste: {
    title: 'Waste System',
    facility: 'Facility',
    reportingYear: 'Reporting year',
    municipality: 'Municipality',
    wasteCode: 'Waste code',
    method: 'Method',
    generateReport: 'Generate report',
    submitReport: 'Submit report',
    draft: 'Draft',
    submitted: 'Submitted',
  },
  debtors: {
    title: 'Debtors',
    subtotal: 'Subtotal',
    grandTotal: 'Grand total',
  },
  settings: {
    title: 'Settings',
    companyInfo: 'Company info',
    companyName: 'Company name',
    address: 'Address',
    ticketConfig: 'Ticket settings',
    controlFields: 'Control fields',
    scaleConfig: 'Scale settings',
    comPort: 'COM port',
    baudRate: 'Baud rate',
  },
  ticket: {
    weighingReceipt: 'Weighing receipt',
    weighingNo: 'Weighing no.',
    date: 'Date',
    time: 'Time',
    vehicle: 'Vehicle',
    carrier: 'Carrier',
    customer: 'Customer',
    product: 'Product',
    firstWeighing: '1st weighing',
    secondWeighing: '2nd weighing',
    net: 'Net',
    direction: 'Direction',
    operator: 'Operator',
    notes: 'Notes',
  },
}

export const translations: Record<string, TranslationKeys> = { da, en }
