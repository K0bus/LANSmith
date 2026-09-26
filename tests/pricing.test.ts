import { formatCentsToPrice, getEffectivePrice } from '../shared/utils/pricing'
import { fetchSteamPrice, fetchKeyshopPrice } from '../server/utils/pricingService'

console.log('🧪 Exécution des tests du module de tarification & partage LANSmith...\n')

// Test 1: formatCentsToPrice
console.log('--- Test 1: Formatage des montants en centimes ---')
const p1 = formatCentsToPrice(2999, 'EUR')
const p2 = formatCentsToPrice(0, 'EUR')
const p3 = formatCentsToPrice(null, 'EUR')
console.log('2999 cents ->', p1)
console.log('0 cents ->', p2)
console.log('null cents ->', p3)
if (!p1.includes('29,99') && !p1.includes('29.99')) throw new Error('Échec format 2999')
if (!p2.includes('0,00') && !p2.includes('0.00')) throw new Error('Échec format 0')
console.log('✅ Test 1 validé !\n')

// Test 2: Free to Play
console.log('--- Test 2: Free to Play ---')
const f2p = getEffectivePrice({
  name: 'Counter-Strike 2',
  acquisitionType: 'FREE_TO_PLAY',
  steamPriceCents: 0
})
console.log('F2P effective price:', f2p)
if (!f2p.is_free || f2p.source !== 'FREE_TO_PLAY' || f2p.display_price !== '0,00 €') {
  throw new Error('Échec logique F2P')
}
console.log('✅ Test 2 validé !\n')

// Test 3: Friend Share (Partage entre amis)
console.log('--- Test 3: Partage entre amis ---')
const share = getEffectivePrice({
  name: 'Left 4 Dead 2',
  acquisitionType: 'FRIEND_SHARE',
  friendDownloadUrl: '\\\\NAS-LAN\\Jeux\\L4D2',
  steamPriceCents: 999
})
console.log('Friend share effective price:', share)
if (!share.is_free || share.source !== 'FRIEND_SHARE' || share.friend_download_url !== '\\\\NAS-LAN\\Jeux\\L4D2') {
  throw new Error('Échec logique Friend Share')
}
console.log('✅ Test 3 validé !\n')

// Test 4: STORE_BUY with Keyshop cheaper than Steam
console.log('--- Test 4: Store Buy (Marché gris moins cher que Steam) ---')
const deal = getEffectivePrice({
  name: 'Among Us',
  acquisitionType: 'STORE_BUY',
  steamPriceCents: 499,
  keyshopPriceCents: 199,
  currency: 'EUR'
})
console.log('Store deal effective price:', deal)
if (deal.is_free || deal.source !== 'KEYSHOP' || deal.savings_cents !== 300 || deal.raw_cents !== 199) {
  throw new Error('Échec comparaison clés vs steam')
}
if (deal.keyshop_url !== 'https://isthereanydeal.com/game/among-us/info/') {
  throw new Error(`Échec génération URL slug IsThereAnyDeal: obtenu ${deal.keyshop_url}, attendu https://isthereanydeal.com/game/among-us/info/`)
}

// Test 4b: Nettoyage des suffixes IGDB comme meccha-chameleon--1
const chameleon = getEffectivePrice({
  name: 'Meccha Chameleon',
  slug: 'meccha-chameleon--1',
  acquisitionType: 'STORE_BUY',
  steamPriceCents: 999,
  keyshopPriceCents: 499,
  currency: 'EUR'
})
console.log('Chameleon keyshop_url:', chameleon.keyshop_url)
if (chameleon.keyshop_url !== 'https://isthereanydeal.com/game/meccha-chameleon/info/') {
  throw new Error(`Échec nettoyage suffixe IGDB: obtenu ${chameleon.keyshop_url}, attendu https://isthereanydeal.com/game/meccha-chameleon/info/`)
}
console.log('✅ Test 4 & 4b validés (Lien IsThereAnyDeal avec slug nettoyé: https://isthereanydeal.com/game/meccha-chameleon/info/) !\n')

// Test 5: STORE_BUY with Steam cheaper than Keyshop
console.log('--- Test 5: Store Buy (Steam promo moins cher que keyshop) ---')
const steamCheaper = getEffectivePrice({
  name: 'FlatOut 2',
  acquisitionType: 'STORE_BUY',
  steamPriceCents: 199,
  keyshopPriceCents: 350,
  currency: 'EUR'
})

console.log('Steam cheaper effective price:', steamCheaper)
if (steamCheaper.is_free || steamCheaper.source !== 'STEAM' || steamCheaper.raw_cents !== 199) {
  throw new Error('Échec comparaison steam moins cher')
}
console.log('✅ Test 5 validé !\n')

// Test 6: Ingestion Steam API (Live test for CS2 appId: 730)
console.log('--- Test 6: Fetch Steam API réel (CS2 appId: 730) ---')
async function runSteamLiveTest() {
  try {
    const res = await fetchSteamPrice('730')
    console.log('Steam API live result for CS2:', res)
    if (res && res.success) {
      console.log('✅ Steam API accessible et décodée avec succès !')
    } else {
      console.log('ℹ️ Steam API a retourné une réponse vide (potentiellement bloqué par réseau ou gratuit sans price_overview), géré sans crash.')
    }
  } catch (err) {
    console.warn('Steam API network error:', err)
  }
}

// Test 7: Keyshop price retrieval for Among Us (appId: 945360, Steam price: 4.49 €)
console.log('--- Test 7: Récupération du meilleur deal / revendeur pour Among Us ---')
async function runKeyshopCalibrationTest() {
  const keyshopResult = await fetchKeyshopPrice('Among Us', '945360', 449, 'among-us')
  console.log('Keyshop live result for Among Us:', keyshopResult)
  if (!keyshopResult || !keyshopResult.success || !keyshopResult.priceCents) {
    throw new Error('Échec fetchKeyshopPrice pour Among Us')
  }
  if (!keyshopResult.dealUrl) {
    throw new Error('dealUrl manquant dans le résultat')
  }
  console.log(`✅ Test 7 validé : Meilleur deal (${keyshopResult.shopName}) à ${(keyshopResult.priceCents/100).toFixed(2)} € avec lien direct : ${keyshopResult.dealUrl}\n`)
}

Promise.all([runSteamLiveTest(), runKeyshopCalibrationTest()]).then(() => {
  console.log('\n🎉 Tous les tests unitaires de tarification sont passés avec succès !')
})



