import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { XMLParser } from 'fast-xml-parser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const xmlPath = resolve(__dirname, '../../king-lear_XML_FolgerShakespeare/Lr.xml')
const outPath = resolve(__dirname, '../src/data/king-lear.json')

const xml = readFileSync(xmlPath, 'utf8')

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: false,
  trimValues: false,
  isArray: (name) => [
    'w', 'c', 'pc', 'milestone', 'ptr', 'sp', 'div1', 'div2',
    'speaker', 'ab', 'interp', 'stage', 'head', 'lb', 'pb', 'anchor'
  ].includes(name),
})

const doc = parser.parse(xml)
const tei = doc.TEI

// ── 1. Build textaIds and textbIds from apparatus section ──────────────────
const textaIds = new Set()
const textbIds = new Set()

function collectPtrs(node) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach(collectPtrs)
    return
  }
  for (const [key, val] of Object.entries(node)) {
    if (key === 'ptr') {
      const ptrs = Array.isArray(val) ? val : [val]
      for (const ptr of ptrs) {
        const ana = ptr['@_ana']
        const target = ptr['@_target']
        if (!target) continue
        const ids = target.split(/\s+/).map(t => t.replace(/^#/, ''))
        if (ana === '#texta') ids.forEach(id => textaIds.add(id))
        else if (ana === '#textb') ids.forEach(id => textbIds.add(id))
      }
    } else {
      collectPtrs(val)
    }
  }
}

collectPtrs(tei.text?.back ?? tei.text)

// ── 2. Build wordMap from body ─────────────────────────────────────────────
const wordMap = new Map()

function collectWords(node) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach(collectWords)
    return
  }
  for (const [key, val] of Object.entries(node)) {
    if (key === 'w' || key === 'c' || key === 'pc') {
      const tokens = Array.isArray(val) ? val : [val]
      for (const token of tokens) {
        if (token && typeof token === 'object') {
          const id = token['@_xml:id']
          const text = token['#text'] ?? ''
          if (id) wordMap.set(id, String(text))
        }
      }
    } else {
      collectWords(val)
    }
  }
}

collectWords(tei.text?.body ?? tei.text)

// ── 3. Walk document in order building lines with act/scene/speaker context ─
const acts = []

const body = tei.text?.body ?? tei.text
const div1s = body?.div1 ?? []

for (const div1 of div1s) {
  const actNum = parseInt(div1['@_n'], 10)
  if (isNaN(actNum)) continue
  const scenes = []
  acts.push({ num: actNum, scenes })

  const div2s = div1.div2 ?? []
  for (const div2 of div2s) {
    const sceneNum = parseInt(div2['@_n'], 10)
    if (isNaN(sceneNum)) continue
    const lines = []
    scenes.push({ num: sceneNum, lines })

    // Walk the scene collecting milestones with speaker context
    let currentSpeaker = null

    function walkScene(node) {
      if (!node || typeof node !== 'object') return
      if (Array.isArray(node)) {
        node.forEach(walkScene)
        return
      }

      for (const [key, val] of Object.entries(node)) {
        if (key === 'sp') {
          const sps = Array.isArray(val) ? val : [val]
          for (const sp of sps) {
            // Get speaker name from <speaker> children
            const speakerEls = sp.speaker
            if (speakerEls && speakerEls.length > 0) {
              const spkEl = speakerEls[0]
              const ws = spkEl.w ?? []
              const wTexts = Array.isArray(ws) ? ws : [ws]
              currentSpeaker = wTexts
                .map(w => (typeof w === 'object' ? w['#text'] ?? '' : String(w)))
                .join('')
                .trim()
            }
            // Walk the ab blocks within this sp
            walkScene(sp.ab)
          }
        } else if (key === 'milestone') {
          const milestones = Array.isArray(val) ? val : [val]
          for (const ms of milestones) {
            if (ms['@_unit'] !== 'ftln') continue
            const lineId = ms['@_n']
            const xmlId = ms['@_xml:id'] ?? ''
            const ftlnMatch = xmlId.match(/ftln-(\d+)/)
            const ftln = ftlnMatch ? parseInt(ftlnMatch[1], 10) : 0
            const correspRaw = ms['@_corresp'] ?? ''
            const wordIds = correspRaw.split(/\s+/).filter(Boolean).map(s => s.replace(/^#/, ''))
            const text = wordIds.map(id => wordMap.get(id) ?? '').join('')
            const anaRaw = ms['@_ana'] ?? ''
            const ana = anaRaw.replace(/^#/, '')
            const texta = wordIds.some(id => textaIds.has(id)) ? true : undefined
            const textb = wordIds.some(id => textbIds.has(id)) ? true : undefined

            const line = {
              id: lineId,
              ftln,
              act: actNum,
              scene: sceneNum,
              speaker: currentSpeaker || undefined,
              text,
              ana: ['verse', 'prose', 'short'].includes(ana) ? ana : 'prose',
            }
            if (texta) line.texta = true
            if (textb) line.textb = true
            lines.push(line)
          }
        } else if (key !== '@_xml:id' && key !== '@_n' && key !== '@_type' && key !== '@_who') {
          walkScene(val)
        }
      }
    }

    walkScene(div2)
  }
}

const output = { acts }
writeFileSync(outPath, JSON.stringify(output, null, 2))
console.log(`Written ${outPath}`)

// Summary
let totalLines = 0
let textaCount = 0
let textbCount = 0
for (const act of acts) {
  for (const scene of act.scenes) {
    totalLines += scene.lines.length
    textaCount += scene.lines.filter(l => l.texta).length
    textbCount += scene.lines.filter(l => l.textb).length
  }
}
console.log(`Total lines: ${totalLines}, texta: ${textaCount}, textb: ${textbCount}`)
