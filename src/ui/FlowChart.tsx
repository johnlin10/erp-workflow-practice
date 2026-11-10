// 各系統的流程圖，版面依課堂截圖重畫。藍色方塊是作業，可以點的才是練習版有提供的作業。
type Kind = 'proc' | 'sys' | 'report' | 'event' | 'diamond'
type Node = { id: string; label: string; x: number; y: number; k?: Kind; code?: string; reports?: string[]; w?: number }
type Flow = { title: string; w: number; h: number; nodes: Node[]; edges: [string, string, string?][] }

const P = (id: string, label: string, x: number, y: number, code?: string, w?: number): Node => ({ id, label, x, y, code, w })
const S = (id: string, label: string, x: number, y: number): Node => ({ id, label, x, y, k: 'sys' })
const R = (id: string, x: number, y: number, reports: string[]): Node => ({ id, label: '', x, y, k: 'report', reports })
const E = (id: string, label: string, x: number, y: number): Node => ({ id, label, x, y, k: 'event' })

export const FLOWS: Record<string, Flow> = {
  ADM: {
    title: '管理維護系統', w: 760, h: 300,
    nodes: [
      P('a1', '登入者代號建立作業', 10, 20, 'ADMI10'), P('a2', '群組資料建立作業', 220, 20), P('a3', '系統資料建立作業', 436, 20),
      P('a4', '使用者權限建立作業', 112, 116, 'ADMI05'), P('a5', '程式代號建立作業', 332, 116), P('a6', '檔案資料建立作業', 542, 116),
      P('a7', '多公司資料建立作業', 112, 172), P('a8', '電子表單佇列工作建立作業', 112, 228), P('a9', '電子表單關聯建立作業', 436, 228),
    ],
    edges: [['a1', 'a4'], ['a2', 'a4'], ['a3', 'a5'], ['a3', 'a6'], ['a5', 'a9'], ['a6', 'a9'], ['a9', 'a8']],
  },
  INV: {
    title: '庫存管理系統', w: 760, h: 740,
    nodes: [
      P('i1', '屬性代碼設定作業', 10, 30), P('i2', '屬性組定義建立作業', 10, 72),
      P('i3', '品號類別資料建立作業', 248, 10), P('i4', '品號資料建立作業', 248, 72, 'INVI02'),
      P('i5', '單據性質設定作業', 248, 142), P('i6', '庫存異動單據建立作業', 248, 204), P('i7', '轉撥單據建立作業', 248, 246),
      P('i8', '成本開帳/調整單建立作業', 248, 288), P('i9', '異動明細維護作業', 248, 352), P('i10', '批號資料建立作業', 248, 394),
      P('i11', '月底成本計價作業', 248, 468), P('i12', '自動調整庫存成本作業', 248, 510), P('i13', '月底存貨結轉作業', 248, 552),
      R('i14', 248, 612, ['庫存明細帳', '庫存明細表', '進耗存統計表']),
      P('i15', '抽盤品號產生作業', 10, 204), R('i16', 10, 262, ['庫存盤點卡', '品號盤點清單']), E('i17', '實地盤點', 10, 362),
      P('i18', '盤點數量重新賦予作業', 10, 440), P('i19', '盤點資料建立作業', 10, 500), R('i20', 10, 556, ['盤點盈虧明細表']),
      P('i21', '盤點資料更新作業', 10, 632),
      P('i22', '暫出/入歸還建立作業', 504, 72), P('i23', '暫出/入單建立作業', 504, 142),
      S('i24', '訂單管理系統', 504, 252), S('i25', '採購管理系統', 504, 306), S('i26', '製令管理系統', 504, 360),
      R('i27', 504, 424, ['批號異動追蹤表', '批號庫存明細表', '批號期限管制表']),
      R('i28', 504, 548, ['庫存ABC分析表', '庫存呆滯分析表', '庫存週轉率分析表', '品號再補貨建議表']),
    ],
    edges: [['i3', 'i4'], ['i2', 'i4'], ['i4', 'i5'], ['i5', 'i6'], ['i6', 'i7'], ['i7', 'i8'], ['i8', 'i9'], ['i9', 'i10'],
      ['i10', 'i11'], ['i11', 'i12'], ['i12', 'i13'], ['i13', 'i14'], ['i4', 'i15'], ['i15', 'i16'], ['i16', 'i17'],
      ['i17', 'i18'], ['i18', 'i19'], ['i19', 'i20'], ['i20', 'i21'], ['i23', 'i22'], ['i24', 'i23'], ['i24', 'i9'],
      ['i25', 'i9'], ['i26', 'i9'], ['i10', 'i27'], ['i10', 'i28']],
  },
  COP: {
    title: '訂單管理系統', w: 760, h: 560,
    nodes: [
      P('c1', '信用控制參數設定', 20, 24), P('c2', '客戶資料建立作業', 260, 24, 'COPI01'), E('c3', '客戶訂單變更通知', 500, 28),
      P('c4', '客戶商品計價建立作業', 20, 100), P('c5', '單據性質設定作業', 20, 142), P('c6', '客戶品號資料建立作業', 20, 184),
      P('c7', '合約訂單變更單建立作業', 20, 236),
      P('c8', '報價單建立作業', 260, 100, 'COPI05'), P('c9', '合約訂單建立作業', 260, 164), P('c10', '銷售預測建立作業', 260, 226),
      P('c11', '客戶訂單建立作業', 260, 270, 'COPI06'), P('c12', '銷貨單建立作業', 260, 334, 'COPI08'), P('c13', '銷退單建立作業', 260, 404),
      P('c14', '訂單變更單建立作業', 500, 102, 'COPI07'),
      R('c15', 500, 160, ['訂單預計出貨明細表', '商品預計出貨明細表', '客戶預計出貨明細表', '業務員預計出貨明細表', '客戶接單統計表']),
      S('c16', '庫存管理系統', 20, 318), S('c17', '應收管理系統', 20, 366), S('c18', '銷售分析系統', 20, 414), E('c19', '銷貨退回', 20, 474),
      R('c20', 500, 396, ['客戶銷貨明細表', '客戶銷貨彙總表', '歷史交易記錄表', '商品銷貨期報表']),
    ],
    edges: [['c2', 'c8'], ['c1', 'c4'], ['c8', 'c9'], ['c9', 'c10'], ['c10', 'c11'], ['c11', 'c12'], ['c3', 'c14'], ['c14', 'c11'],
      ['c4', 'c8'], ['c5', 'c9'], ['c6', 'c10'], ['c7', 'c9'], ['c11', 'c15'], ['c12', 'c16'], ['c12', 'c17'], ['c13', 'c17'],
      ['c19', 'c13'], ['c12', 'c20'], ['c13', 'c20']],
  },
  PUR: {
    title: '採購管理系統', w: 760, h: 640,
    nodes: [
      P('p1', '供應商資料建立作業', 260, 8), P('p2', '品號廠商建立作業', 10, 70), P('p3', '單據性質設定作業', 10, 110),
      P('p4', '廠商品號檢驗方式建立', 10, 150), P('p5', '合約採購變更單建立作業', 10, 192), P('p6', '採購變更單建立作業', 10, 232),
      P('p7', '核價單建立作業', 260, 76), P('p8', '合約採購單建立作業', 260, 178), P('p9', '採購單建立作業', 260, 218, 'PURI07'),
      P('p10', '進貨單建立作業', 260, 282, 'PURI09'),
      { id: 'p11', label: '檢驗', x: 270, y: 340, k: 'diamond', w: 180 },
      P('p12', '進貨單建立作業\n/進貨驗收', 260, 408, 'PURI09'), R('p13', 260, 480, ['廠商進貨明細表', '廠商進貨彙總表', '品號歷史進貨記錄表']),
      S('p14', '生產計劃系統', 510, 120), P('p15', '請購單建立作業', 510, 178, 'PURI05'), P('p16', '請購資料維護作業', 510, 218, 'PURI06'),
      P('p17', '請購資料更新作業', 510, 258, 'PURB01'), R('p18', 510, 300, ['廠商預計進貨表', '品號預計進貨表', '製令預計進貨表', '採購預計進貨表']),
      P('p19', '驗退件退回作業', 510, 530), R('p20', 510, 580, ['採購價格異常表', '廠商進貨異常表']),
      S('p21', '庫存管理系統', 10, 280), S('p22', '應付管理系統', 10, 326), P('p23', '退貨單建立作業', 10, 392),
      E('p24', '進貨退回', 10, 452), P('p25', '統計資料更新作業', 10, 516), R('p26', 10, 560, ['廠商ABC分析表', '廠商進貨統計表']),
    ],
    edges: [['p1', 'p7'], ['p1', 'p2'], ['p7', 'p8'], ['p7', 'p9'], ['p14', 'p15'], ['p15', 'p9'], ['p16', 'p9'], ['p17', 'p9'],
      ['p5', 'p8'], ['p6', 'p9'], ['p9', 'p10'], ['p10', 'p21'], ['p10', 'p11'], ['p11', 'p12', '合格'], ['p11', 'p19', '不合格'],
      ['p12', 'p13'], ['p12', 'p25'], ['p23', 'p22'], ['p24', 'p23'], ['p25', 'p26']],
  },
}

const BOX_W = 200, BOX_H = 38
const size = (n: Node) => {
  if (n.k === 'report') return { w: n.w ?? 200, h: 26 + (n.reports!.length - 1) * 30 + 14 }
  if (n.k === 'diamond') return { w: n.w ?? 180, h: 44 }
  return { w: n.w ?? BOX_W, h: n.label.includes('\n') ? 50 : BOX_H }
}

function edgePath(a: Node, b: Node) {
  const A = size(a), B = size(b)
  const ax = a.x + A.w / 2, ay = a.y + A.h / 2, bx = b.x + B.w / 2, by = b.y + B.h / 2
  if (Math.abs(a.x - b.x) < 30) { // 同一欄：上下直線
    const down = by > ay
    return `M${ax},${down ? a.y + A.h : a.y} L${bx},${down ? b.y : b.y + B.h}`
  }
  const right = bx > ax
  const sx = right ? a.x + A.w : a.x, ex = right ? b.x : b.x + B.w
  const mx = (sx + ex) / 2
  return `M${sx},${ay} L${mx},${ay} L${mx},${by} L${ex},${by}`
}

export function FlowChart({ sys, onOpen, has }: { sys: string; onOpen: (code: string) => void; has: (code: string) => boolean }) {
  const f = FLOWS[sys]
  if (!f) return null
  const byId = Object.fromEntries(f.nodes.map(n => [n.id, n]))
  return (
    <div className="flow">
      <div className="flow-title"><b>▶▶</b>{f.title}</div>
      <div className="flow-canvas" style={{ width: f.w, height: f.h }}>
        <svg width={f.w} height={f.h} className="flow-edges">
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8" fill="none" stroke="#7d8597" strokeWidth="1.2" />
            </marker>
          </defs>
          {f.edges.map(([a, b, label], i) => (
            <g key={i}>
              <path d={edgePath(byId[a], byId[b])} fill="none" stroke="#7d8597" strokeWidth="1.3" markerEnd="url(#arr)" />
              {label && <text x={byId[b].x - 4} y={byId[b].y - 6} fontSize="14" fill="#222" textAnchor="end">{label}</text>}
            </g>
          ))}
        </svg>
        {f.nodes.map(n => {
          const s = size(n)
          const style = { left: n.x, top: n.y, width: s.w, height: s.h }
          if (n.k === 'report') return (
            <div key={n.id} className="flow-reports" style={style}>
              {n.reports!.map((r, i) => <div key={r} className="flow-report" style={{ top: i * 30, left: i * 8 }}>{r}</div>)}
            </div>
          )
          const ok = !!n.code && has(n.code)
          return (
            <button key={n.id} className={`flow-node ${n.k ?? 'proc'} ${ok ? 'ok' : ''}`} style={style}
              title={ok ? `開啟 ${n.label.replace('\n', '')}(${n.code})` : '練習版未提供此作業'}
              onClick={() => ok && onOpen(n.code!)}>
              {n.k === 'diamond' ? <span className="diamond-shape" /> : null}
              <span className="flow-label">{n.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
