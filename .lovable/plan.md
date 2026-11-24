# Çıtçıt mandalını kapağa bağlama

## Sorun
Menteşeli modda, ön çıtçıt dili kapağın kenarından 0.3 mm dışarıda duruyor. Arada bağlantı olmadığı için dil havada kalıyor ve ayrı bir parça gibi basılıyor.

## Çözüm
- Kapağın ön kenarı ile mandal dilinin üst ucu arasına, kapak kalınlığında sağlam bir **bağlantı köprüsü** eklenecek. Köprü kapağın içine ~2 mm girecek, dilin dış yüzüne kadar uzanacak.
- Dil, kilit dudağı ve açma kulakçığı aynı yerde kalacak; kapakla birlikte tek parça basılacak.
- Dilin esneme boyu (kapağın altına inen kısım) değişmeyecek; kilitleme yine çalışacak.
- Kapak baskı yönünde (ters çevrilmiş) köprü düz yüzde kalır, destek gerekmez.

## Teknik detay
- `src/lib/enclosure.ts` → `buildLid()` hinge dalı: tırnak eklenmeden önce
  `box(SNAP_W, t, 2 + 0.3 + SNAP_T)` köprüsü, merkez `y = t/2`, `z = depth/2 - 2 + (2.3 + SNAP_T)/2` konumunda ADDITION ile eklenecek.
- Başka dosya değişmeyecek; Playwright ile önizlemede mandalın kapağa bitişik göründüğü kontrol edilecek.
