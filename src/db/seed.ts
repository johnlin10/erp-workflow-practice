import type { DB, Item, Supplier, Customer } from './schema'

// 預設資料：依課堂截圖建立。截圖看不到的值（單價、主供應商、庫別名稱）是推測的。
const item = (id: string, name: string, spec: string, unit: string, mainSupplier: string, price: number, cost: number, mainWarehouse = 'P003', acct = '1'): Item =>
  ({ id, name, spec, unit, mainWarehouse, mainSupplier, leadDays: 7, price, cost, remark: '', acct, lastCost: 0, retail: 0, floorPrice: 0, ext: {} })

const sup = (id: string, short: string, tel = '', contact = '', taxId = '', name = short): Supplier =>
  ({ id, short, name, tel, contact, taxId, currency: 'NTD', payTerm: '', taxCode: 'P02', ext: {} })

const cust = (id: string, short: string, name: string, creditLimit: number, more: Partial<Customer> = {}): Customer => ({
  id, short, name, enName: '', owner: '', contact: '', tel: '', fax: '', email: '', taxId: '',
  currency: 'NTD', taxCode: 'S02', payTerm: '', sales: '201', dept: '', creditLimit, address: '', ext: {}, ...more,
})

const TAX_TYPE_NAME: Record<string, string> = { 1: '應稅內含', 2: '應稅外加', 3: '零稅', 4: '免稅', 9: '不計稅' }
const TAX_KINDS: [string, string, string, number][] = [
  ['01', '二聯式發票', '1', 5], ['02', '二聯式發票', '2', 5], ['03', '二聯式發票', '3', 0],
  ['04', '三聯式發票', '1', 5], ['05', '三聯式發票', '2', 5], ['06', '三聯式發票', '3', 0],
  ['07', '二聯式收銀機發票', '1', 5], ['08', '二聯式收銀機發票', '3', 0],
  ['09', '三聯式收銀機發票', '1', 5], ['10', '三聯式收銀機發票', '2', 5], ['11', '三聯式收銀機發票', '3', 0],
  ['12', '電子計算機發票', '1', 5], ['13', '電子計算機發票', '2', 5], ['14', '電子計算機發票', '3', 0],
  ['15', '免用發票', '3', 0], ['16', '免用發票', '4', 0], ['17', '免用發票', '9', 0],
  ['18', '三聯式發票', '4', 0], ['19', '三聯式收銀機發票', '4', 0],
  ['20', '電子發票', '1', 5], ['21', '電子發票', '2', 5], ['22', '電子發票', '3', 0],
]

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
    // 稅別碼：銷售用 S、採購用 P，依發票聯式分組。清單取自同學的專案（見下方廠商資料的註解）
    taxCodes: (['S', 'P'] as const).flatMap(k => TAX_KINDS.map(([n, inv, type, rate]) =>
      ({ id: k + n, name: `${k === 'S' ? '銷項' : '進項'}${inv}-${TAX_TYPE_NAME[type]}`, taxType: type, rate }))),
    items: [
      item('410001', '數位相機-SL系列', 'SL1001', '台', '1001', 8500, 6000),
      item('410002', '數位相機-大眾型', 'SL1002', '台', '1001', 6500, 4500),
      item('610002', '數位相機-專業型', 'PF1002', '台', '1007', 25000, 18000),
      item('610003', '數位相機-類單眼SX740型', '40倍光學對焦+內建WIFI 4K UHD', '台', '1007', 15000, 11000),
      item('900004', '相機外掛麥克風組', '通用', '組', '1202', 1200, 700),
      item('0307-01', '主機外殼', '黑色', '個', '1009', 300, 150),
      // 以下品號取自同學的專案（見下方廠商資料的註解）；主供應商原資料沒有，W01 主原料庫對應到 P001
      item('410004', '數位相機-專業型', 'SL系列', '台', '', 15000, 12000, 'P003', '05'),
      item('800001', 'AI 智能磁吸補光燈', '雙色溫高顯色補光配件', '個', '', 990, 650, 'P001', '1201'),
      item('800002', '多功能手持延長自拍桿', '內建三腳架 1/4螺孔', '支', '', 750, 450, 'P001', '1201'),
      item('900001', '三腳架', '輕量鋁合金可折疊', 'set', '', 1200, 800, 'P003', '1201'),
      item('900002', '充電器', '雙插槽智能快充座', 'ea', '', 990, 650, 'P003', '1201'),
      item('900003', '拭鏡布-防靜電', '超細纖維抗靜電擦拭布', 'pcs', '', 100, 50, 'P003', '1201'),
      item('900006', 'Insta360 Flow 2 Pro / Flow 2', '全功能 AI 三軸手機穩定器', '台', '', 5500, 4200, 'P003', '05'),
    ],
    customers: [
      // 1002 和 1001、1003、1004、1109 取自同學的專案；1107 代號相同但公司不同，保留課堂截圖的資料
      cust('1001', '宏碁科技', '宏碁股份有限公司', 5000000, { enName: 'Acer Inc.', owner: '陳俊聖', contact: '林小姐', tel: '02-26961234', fax: '02-26965678', email: 'service@acer.com', taxId: '04283908' }),
      cust('1002', '標竿公司', '標竿精密科技股份有限公司', 5000000, { enName: 'ASUSTeK Computer Inc.', owner: '黃董事長', contact: '黃經理', tel: '02-28943447', fax: '02-28943448', email: 'info@asus.com', taxId: '53829104' }),
      cust('1003', '微星科技', '微星科技股份有限公司', 5000000, { enName: 'Micro-Star International Co., Ltd.', owner: '徐祥', contact: '吳課長', tel: '02-32345599', fax: '02-32345598', email: 'sales@msi.com', taxId: '22538772' }),
      cust('1004', '聯強國際', '聯強國際股份有限公司', 5000000, { enName: 'Synnex Technology International Corp.', owner: '杜書伍', contact: '王專員', tel: '02-25063320', fax: '02-25063321', email: 'synnex@synnex.com.tw', taxId: '22754898' }),
      cust('1107', '上奇有限公司', '上奇有限公司', 0),
      cust('1109', '上奇科技', '上奇科技股份有限公司', 5000000, { enName: 'GrandTech Cloud Services Inc.', owner: '張雲飛', contact: '陳志明', tel: '02-87923001', fax: '02-87923002', email: 'contact@grandtech.com.tw', taxId: '84149615' }),
    ],
    suppliers: [
      // 廠商資料取自同學的專案 tailing-cloud/workflow-erp-conductor（MIT 授權）的 default_seeds.json
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
      sup('3003', '達智科技', '', '', '17461189', '達智科技股份有限公司'),
      sup('3004', '柏金沖壓', '', '', '28824201', '柏金沖壓股份有限公司'),
      sup('4001', '華南銀行'),
      sup('4002', '揚朋海運', '02-25113301', '陳經理', '12849501', '揚朋海運股份有限公司'),
      sup('4003', '飛龍空運', '02-27128899', '林協理', '23819405', '飛龍空運承攬有限公司'),
      sup('4004', '領先報關行', '02-25036677', '張主任', '34918276', '領先國際報關行股份有限公司'),
      sup('4005', '為升國際貿易', '02-87915500', '尤山泉', '84920183', '為升國際貿易股份有限公司'),
      sup('A001', '金皇國際', '02-89667701', '林美瑤', '27243938', '金皇國際股份有限公司'),
      sup('A002', 'IBM電腦', '', '', '73647815', 'IBM電腦(股)公司'),
      sup('V001', '影石創新', '0755-86655123', '劉經理', '9144030009', '深圳影石創新科技股份有限公司台灣分公司'),
      sup('V002', '大疆科技', '02-23456789', '張協理', '83726194', '大疆創新科技有限公司台灣辦事處'),
      sup('V003', '聯強物流', '02-25063388', '李課長', '22754899', '聯強國際倉儲物流股份有限公司'),
      sup('Z001', '莫克立'),
    ],
    quotes: [], orders: [], orderChanges: [], requisitions: [], purchases: [], receipts: [], sales: [],
    stock: [], jobs: [], counters: {},
  }
}
