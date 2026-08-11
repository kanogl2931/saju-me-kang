import { Lunar, Solar } from 'lunar-javascript'

export function calculateAge(birthDate) {
  const today = new Date()
  const birth = new Date(birthDate)

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }

  return age
}

const WU_XING_GAN = {
  甲: '木',
  乙: '木',
  丙: '火',
  丁: '火',
  戊: '土',
  己: '土',
  庚: '金',
  辛: '金',
  壬: '水',
  癸: '水',
}

const WU_XING_ZHI = {
  子: '水',
  丑: '土',
  寅: '木',
  卯: '木',
  辰: '土',
  巳: '火',
  午: '火',
  未: '土',
  申: '金',
  酉: '金',
  戌: '土',
  亥: '水',
}

const TRIAD_GROUPS = [
  { key: '申子辰', branches: ['申', '子', '辰'] },
  { key: '寅午戌', branches: ['寅', '午', '戌'] },
  { key: '亥卯未', branches: ['亥', '卯', '未'] },
  { key: '巳酉丑', branches: ['巳', '酉', '丑'] },
]

const TWELVE_SINSAL_RULES = {
  역마: { 申子辰: '寅', 寅午戌: '申', 亥卯未: '巳', 巳酉丑: '亥' },
  도화: { 申子辰: '酉', 寅午戌: '卯', 亥卯未: '子', 巳酉丑: '午' },
  겁살: { 申子辰: '巳', 寅午戌: '亥', 亥卯未: '申', 巳酉丑: '寅' },
  재살: { 申子辰: '午', 寅午戌: '子', 亥卯未: '酉', 巳酉丑: '卯' },
  천살: { 申子辰: '未', 寅午戌: '丑', 亥卯未: '戌', 巳酉丑: '辰' },
  지살: { 申子辰: '午', 寅午戌: '子', 亥卯未: '酉', 巳酉丑: '卯' },
  화개: { 申子辰: '辰', 寅午戌: '戌', 亥卯未: '未', 巳酉丑: '丑' },
}

function findTriadKey(branch) {
  const group = TRIAD_GROUPS.find(({ branches }) => branches.includes(branch))
  return group?.key ?? null
}

function getWuXingOfGan(gan) {
  return WU_XING_GAN[gan] ?? ''
}

function getWuXingOfZhi(zhi) {
  return WU_XING_ZHI[zhi] ?? ''
}

function countWuXingDistribution(eightChar) {
  const counts = { 金: 0, 木: 0, 水: 0, 火: 0, 土: 0 }

  const addWuXing = (value) => {
    for (const char of value) {
      if (counts[char] !== undefined) {
        counts[char] += 1
      }
    }
  }

  addWuXing(eightChar.getYearWuXing())
  addWuXing(eightChar.getMonthWuXing())
  addWuXing(eightChar.getDayWuXing())
  addWuXing(eightChar.getTimeWuXing())

  for (const hideGan of [
    ...String(eightChar.getYearHideGan()).split(','),
    ...String(eightChar.getMonthHideGan()).split(','),
    ...String(eightChar.getDayHideGan()).split(','),
    ...String(eightChar.getTimeHideGan()).split(','),
  ]) {
    const gan = hideGan.trim()
    if (gan) addWuXing(getWuXingOfGan(gan))
  }

  return counts
}

function getTwelveSinsal(yearZhi, branches) {
  const triadKey = findTriadKey(yearZhi)
  if (!triadKey) return []

  const found = []

  for (const [name, mapping] of Object.entries(TWELVE_SINSAL_RULES)) {
    const targetBranch = mapping[triadKey]
    for (const branch of branches) {
      if (branch === targetBranch) {
        found.push(`${name}(${branch})`)
      }
    }
  }

  return found
}

function getMonthCommand(monthZhi) {
  const element = getWuXingOfZhi(monthZhi)
  return `${monthZhi}(${element})`
}

function buildYearLuck(eightChar, genderCode, startYear, endYear) {
  const yun = eightChar.getYun(genderCode)
  const items = []

  for (const daYun of yun.getDaYun()) {
    for (const liuNian of daYun.getLiuNian()) {
      const year = liuNian.getYear()
      if (year >= startYear && year <= endYear) {
        items.push(`${year}: ${liuNian.getGanZhi()}`)
      }
    }
  }

  return items
}

function buildMonthLuck(eightChar, genderCode, year) {
  const yun = eightChar.getYun(genderCode)

  for (const daYun of yun.getDaYun()) {
    for (const liuNian of daYun.getLiuNian()) {
      if (liuNian.getYear() === year) {
        return liuNian.getLiuYue().map((liuYue, index) => {
          return `${String(index + 1).padStart(2, '0')}월: ${liuYue.getGanZhi()}`
        })
      }
    }
  }

  return Array.from({ length: 12 }, (_, index) => `${String(index + 1).padStart(2, '0')}월`)
}

function parseBirthDateTime(birthDate, birthTime) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)
  return { year, month, day, hour, minute }
}

function createEightChar({ birthDate, birthTime, calendarType }) {
  const { year, month, day, hour, minute } = parseBirthDateTime(birthDate, birthTime)

  if (calendarType === 'lunar') {
    return Lunar.fromYmdHms(year, month, day, hour, minute, 0).getEightChar()
  }

  return Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar().getEightChar()
}

function formatPillarList(values) {
  return values.filter(Boolean).join(' | ')
}

export function calculateSaju({ birthDate, birthTime, gender, calendarType }) {
  const eightChar = createEightChar({ birthDate, birthTime, calendarType })
  const genderCode = gender === 'female' ? 0 : 1
  const yun = eightChar.getYun(genderCode)
  const currentYear = new Date().getFullYear()

  const year = eightChar.getYear()
  const month = eightChar.getMonth()
  const day = eightChar.getDay()
  const time = eightChar.getTime()

  const yearZhi = eightChar.getYearZhi()
  const monthZhi = eightChar.getMonthZhi()
  const dayZhi = eightChar.getDayZhi()
  const timeZhi = eightChar.getTimeZhi()
  const branches = [yearZhi, monthZhi, dayZhi, timeZhi]

  const wuXing = countWuXingDistribution(eightChar)
  const twelveSinsal = getTwelveSinsal(yearZhi, branches)
  const daYunList = yun
    .getDaYun()
    .slice(1, 10)
    .map((item, index) => `${index + 1}운: ${item.getGanZhi()} (${item.getStartAge()}세~)`)

  const chart = {
    pillars: { year, month, day, time },
    wuXing,
    shiShenGan: [
      eightChar.getYearShiShenGan(),
      eightChar.getMonthShiShenGan(),
      '일주',
      eightChar.getTimeShiShenGan(),
    ],
    shiShenZhi: [
      String(eightChar.getYearShiShenZhi()),
      String(eightChar.getMonthShiShenZhi()),
      String(eightChar.getDayShiShenZhi()),
      String(eightChar.getTimeShiShenZhi()),
    ],
    hideGan: {
      year: String(eightChar.getYearHideGan()),
      month: String(eightChar.getMonthHideGan()),
      day: String(eightChar.getDayHideGan()),
      time: String(eightChar.getTimeHideGan()),
    },
    naYin: {
      year: eightChar.getYearNaYin(),
      month: eightChar.getMonthNaYin(),
      day: eightChar.getDayNaYin(),
      time: eightChar.getTimeNaYin(),
    },
    diShi: {
      year: eightChar.getYearDiShi(),
      month: eightChar.getMonthDiShi(),
      day: eightChar.getDayDiShi(),
      time: eightChar.getTimeDiShi(),
    },
    twelveSinsal,
    xun: eightChar.getDayXun(),
    xunKong: eightChar.getDayXunKong(),
    monthCommand: getMonthCommand(monthZhi),
    daYunStart: yun.getStartYear(),
    yearLuck: buildYearLuck(eightChar, genderCode, currentYear - 5, currentYear + 6),
    monthLuck: buildMonthLuck(eightChar, genderCode, currentYear),
    daYun: daYunList,
  }

  chart.formatted = formatSajuChart(chart)
  return chart
}

export function formatSajuChart(chart) {
  const { pillars, wuXing, shiShenGan, shiShenZhi, hideGan, naYin, diShi } = chart

  return [
    `년주: ${pillars.year}, 월주: ${pillars.month}, 일주: ${pillars.day}, 시주: ${pillars.time}`,
    `오행 분포: 금${wuXing.金} 목${wuXing.木} 수${wuXing.水} 화${wuXing.火} 토${wuXing.土}`,
    `십신(천간): ${formatPillarList(shiShenGan)}`,
    `십신(지지): ${formatPillarList(shiShenZhi)}`,
    `지장간: 년(${hideGan.year}) 월(${hideGan.month}) 일(${hideGan.day}) 시(${hideGan.time})`,
    `납음: 년(${naYin.year}) 월(${naYin.month}) 일(${naYin.day}) 시(${naYin.time})`,
    `십이운성: 년(${diShi.year}) 월(${diShi.month}) 일(${diShi.day}) 시(${diShi.time})`,
    `12신살: ${chart.twelveSinsal.length > 0 ? chart.twelveSinsal.join(', ') : '해당 없음'}`,
    `旬/공망: ${chart.xun} / ${chart.xunKong}`,
    `월령: ${chart.monthCommand}`,
    `대운수: ${chart.daYunStart}세`,
    `세운: ${chart.yearLuck.join(', ')}`,
    `월운: ${chart.monthLuck.join(', ')}`,
    `대운: ${chart.daYun.join(' | ')}`,
  ].join('\n')
}
