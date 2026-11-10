import type { DB, Item, Supplier, Customer } from './schema'

// 預設資料：依課堂截圖建立。截圖看不到的值（單價、主供應商、庫別名稱）是推測的。
const item = (id: string, name: string, spec: string, unit: string, mainSupplier: string, price: number, cost: number): Item =>
  ({ id, name, spec, unit, mainWarehouse: 'P003', mainSupplier, leadDays: 7, price, cost, remark: '', acct: '1' })

const sup = (id: string, short: string, tel = '', contact = '', taxId = '', name = short): Supplier =>
  ({ id, short, name, tel, contact, taxId, currency: 'NTD', payTerm: '' })

const cust = (id: string, short: string, name: string, creditLimit: number): Customer => ({
  id, short, name, enName: '', owner: '', contact: '', tel: '', fax: '', email: '', taxId: '',
  currency: 'NTD', taxCode: 'S02', payTerm: '', sales: '201', dept: '', creditLimit, address: '',
})

export function seed(): DB {
  return {
    schemaVersion: 1,
    company: '學生區',
    users: [{ id: 'admin', name: '系統管理員', email: '', password: 'admin', locked: false, expiry: '', companies: '學生區' }],
    perms: [{ userId: 'admin', group: '', dept: '', remark: '預設超級使用者', superuser: true, lines: [] }],
    plants: [{ id: 'TP01', name: '製造一廠' }, { id: 'TY01', name: '製造二廠' }],
    warehouses: [
      { id: 'P001', name: '原料倉', plant: 'TP01' },
      { id: 'P002', name: '半成品倉', plant: 'TP01' },
      { id: 'P003', name: '成品倉', plant: 'TP01' },
      { id: 'Y001', name: '二廠倉', plant: 'TY01' },
    ],
    docTypes: [
      { id: 'C211', name: '配銷報價單', kind: 'quote' },
      { id: 'A221', name: '國內訂單', kind: 'order' },
      { id: 'C311', name: '配銷請購單', kind: 'requisition' },
      { id: 'B311', name: '原料請購單', kind: 'requisition' },
      { id: 'A331', name: '國內採購單', kind: 'purchase' },
      { id: 'A341', name: '國內進貨單', kind: 'receipt' },
      { id: 'A231', name: '銷貨單', kind: 'sale' },
    ],
    employees: [
      { id: '1001', name: '林小明', dept: '採購部' },
      { id: '145', name: '陳志強', dept: '採購部' },
      { id: '403', name: '王美玲', dept: '採購部' },
      { id: '201', name: '張家豪', dept: '業務部' },
    ],
    currencies: [{ id: 'NTD', name: '台幣', rate: 1 }],
    taxCodes: [
      { id: 'S01', name: '應稅內含', taxType: '1', rate: 5 },
      { id: 'S02', name: '應稅外加', taxType: '2', rate: 5 },
      { id: 'S03', name: '零稅率', taxType: '3', rate: 0 },
      { id: 'S04', name: '免稅', taxType: '4', rate: 0 },
    ],
    items: [
      item('410001', '數位相機-SL系列', 'SL1001', '台', '1001', 8500, 6000),
      item('410002', '數位相機-大眾型', 'SL1002', '台', '1001', 6500, 4500),
      item('610002', '數位相機-專業型', 'PF1002', '台', '1007', 25000, 18000),
      item('610003', '數位相機-類單眼SX740型', '40倍光學對焦+內建WIFI 4K UHD', '台', '1007', 15000, 11000),
      item('900004', '相機外掛麥克風組', '通用', '組', '1202', 1200, 700),
      item('0307-01', '主機外殼', '黑色', '個', '1009', 300, 150),
    ],
    customers: [
      cust('1002', '標竿公司', '標竿股份有限公司', 0),
      cust('1107', '上奇有限公司', '上奇有限公司', 0),
    ],
    suppliers: [
      sup('1001', '三星公司', '06-2684511', '', '74997493'),
      sup('1002', '大進公司', '', '', '36173758'),
      sup('1003', '日昇公司', '', '', '28978704'),
      sup('1004', '冠軍公司', '8911-3333', '周小姐', '12341236'),
      sup('1005', '百全公司', '', '', '17971697'),
      sup('1006', '優先公司', '8911-6666', '周小姐', '12351233'),
      sup('1007', '名望公司'),
      sup('1008', '華夏公司'),
      sup('1009', '永德公司'),
      sup('1103', '超越實業', '', '', '', '超越實業股份有限公司'),
      sup('1104', '大智公司', '', '', '28682266'),
      sup('1201', '日昇供應商'),
      sup('1202', '嘉嘉供應商'),
      sup('2001', '進口廠商'),
      sup('3003', '達智科技', '', '', '17461189'),
      sup('3004', '柏金沖壓', '', '', '28824201'),
      sup('A001', '金皇國際', '', '林美瑤'),
    ],
    quotes: [], orders: [], orderChanges: [], requisitions: [], purchases: [], receipts: [], sales: [],
    stock: [], jobs: [], counters: {},
  }
}
