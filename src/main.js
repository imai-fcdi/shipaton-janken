import { createClient } from '@supabase/supabase-js'
import './style.css'

const supabase = createClient(
  import.meta.env.SUPABASE_PROJECT_URL,
  import.meta.env.SUPABASE_PUBLISHABLE_KEY,
)

const EMOJI = { rock: '✊', scissors: '✌️', paper: '✋' }
const LABEL = { win: 'あなたの勝ち！🎉', lose: 'あなたの負け…😢', draw: 'あいこ！🤝' }
const SHORT = { win: '勝ち', lose: '負け', draw: 'あいこ' }

const $ = (id) => document.getElementById(id)
let nickname = localStorage.getItem('janken:nickname') || ''

function showError(msg) {
  $('error').textContent = msg
  $('error').hidden = !msg
}

function enterGame() {
  $('me').textContent = nickname
  $('login').hidden = true
  $('game').hidden = false
  loadMyStats()
}

$('start').addEventListener('click', () => {
  const name = $('nickname').value.trim()
  if (!name) return $('nickname').focus()
  nickname = name
  localStorage.setItem('janken:nickname', nickname)
  enterGame()
})
$('nickname').addEventListener('keydown', (e) => e.key === 'Enter' && $('start').click())
$('change').addEventListener('click', () => {
  $('nickname').value = nickname
  $('game').hidden = true
  $('login').hidden = false
})

document.querySelectorAll('.choice').forEach((btn) =>
  btn.addEventListener('click', () => play(btn.dataset.hand)),
)

async function play(hand) {
  const buttons = document.querySelectorAll('.choice')
  buttons.forEach((b) => (b.disabled = true))
  showError('')
  $('player-hand').textContent = EMOJI[hand]
  $('cpu-hand').textContent = '❔'
  $('cpu-hand').classList.add('shake')
  $('result').textContent = 'じゃん けん…'
  $('result').className = 'result'

  const [{ data, error }] = await Promise.all([
    supabase.rpc('play_janken', { p_nickname: nickname, p_hand: hand }),
    new Promise((r) => setTimeout(r, 600)),
  ])
  $('cpu-hand').classList.remove('shake')
  buttons.forEach((b) => (b.disabled = false))

  if (error) {
    $('result').textContent = '手を選んでください'
    return showError(`通信エラー: ${error.message}`)
  }
  $('cpu-hand').textContent = EMOJI[data.cpu_hand]
  $('result').textContent = LABEL[data.result]
  $('result').className = `result ${data.result}`
  loadMyStats()
  loadBoards()
}

async function loadMyStats() {
  const { data } = await supabase
    .from('janken_leaderboard')
    .select('wins, losses, draws, total')
    .eq('nickname', nickname)
    .maybeSingle()
  const s = data || { wins: 0, losses: 0, draws: 0, total: 0 }
  const rate = s.wins + s.losses ? Math.round((s.wins / (s.wins + s.losses)) * 100) : 0
  $('my-stats').textContent = `通算 ${s.total}戦 ${s.wins}勝 ${s.losses}敗 ${s.draws}分（勝率 ${rate}%）`
}

async function loadBoards() {
  const [board, recent] = await Promise.all([
    supabase.from('janken_leaderboard').select('*').order('wins', { ascending: false }).order('total').limit(10),
    supabase.from('janken_games').select('*').order('created_at', { ascending: false }).limit(10),
  ])
  if (board.error || recent.error) return showError(`読み込みエラー: ${(board.error || recent.error).message}`)

  $('leaderboard').replaceChildren(
    ...board.data.map((r) => li(`${r.nickname}`, `${r.wins}勝 ${r.losses}敗 ${r.draws}分`)),
  )
  if (!board.data.length) $('leaderboard').replaceChildren(li('まだ対戦がありません', ''))

  $('recent').replaceChildren(
    ...recent.data.map((g) =>
      li(`${g.nickname} ${EMOJI[g.player_hand]} vs ${EMOJI[g.cpu_hand]}`, SHORT[g.result], g.result),
    ),
  )
  if (!recent.data.length) $('recent').replaceChildren(li('まだ対戦がありません', ''))
}

function li(text, meta, cls = '') {
  const el = document.createElement('li')
  const a = document.createElement('span')
  a.textContent = text
  const b = document.createElement('span')
  b.textContent = meta
  b.className = `meta ${cls}`
  el.append(a, b)
  return el
}

const PAYWALL_URL = 'https://pay.rev.cat/vizzkbiaikrbdcbp/'

$('support').addEventListener('click', () => {
  let userId = localStorage.getItem('rc_user_id')
  if (!userId) {
    userId = crypto.randomUUID()
    localStorage.setItem('rc_user_id', userId)
  }
  window.open(PAYWALL_URL + encodeURIComponent(userId), '_blank', 'noopener')
})

if (nickname) enterGame()
loadBoards()
