# Nouveautés de Sinople

## Version 1.1 — 5 novembre 2026

### Nouveau : les meubles composés
Un meuble peut maintenant recevoir son propre champ, comme une pièce ou un quartier :
- une partition : « une aigle partie d'or et d'azur » ;
- des pièces et des meubles posés sur lui : « un lion d'or chargé d'une cotice de gueules ».

Sélectionnez un meuble, puis cliquez sur **Composer ▸** dans le panneau de droite.

### La page « Blasonnement » comprend beaucoup plus de choses
Chaque blason de la galerie peut maintenant être écrit en toutes lettres puis redessiné à l'identique. Les nouvelles tournures comprises :
- **les quartiers garnis** : « Écartelé : au 1 d'azur à trois fleurs de lis d'or ; au 2 de gueules à la croix d'argent… », y compris « aux 1 et 4 » ;
- **les parties nommées** : « au 1 d'or, au 2 d'azur… », « en chef et en pointe d'or, aux flancs d'azur » ;
- **« du même »** et **« du champ »**, pour reprendre un émail déjà dit ;
- **les attributs propres à chaque meuble** : couronné, becqué, accorné, ramé, onglé, crêté, chevelé, nimbé… Avant, ils étaient confondus avec « armé » ou ignorés ;
- **les placements autour d'une figure** : surmonté, adextré, senestré, cantonné, accosté, accompagné ;
- **toutes les dispositions** : « rangées au flanc dextre », « au canton dextre du chef », « en point d'honneur »… ;
- **« componée d'argent et de gueules »**, **« posé en bande »**, **« sans nombre »**, **« de six pièces »** ;
- **« engrêlé »**, accepté comme synonyme d'« échancré » ;
- **un meuble chargé** : « un lion d'or chargé d'une cotice d'azur ».

Quand un attribut ne s'applique pas au meuble (une étoile « armée »…), l'application le signale au lieu de l'ignorer sans rien dire.

### Améliorations
- La taille d'un meuble va maintenant jusqu'à ×4.
- L'espacement d'un semé ne descend plus sous 0,30, pour éviter les semés trop serrés.
- Sur un meuble de tanné, les traits intérieurs restent noirs, plus lisibles.
- Une pièce placée dans une partie composée ne propose plus les options « Brochant » et « Sous le tout », qui n'y ont pas de sens.

### Corrections
- **Lien partagé** : après avoir ouvert un lien partagé ou utilisé « Copier le lien », un rechargement de la page faisait revenir au blason du lien et perdre les modifications faites depuis. C'est corrigé.
- L'exemple « à la bordure engrêlée d'or » de l'aide n'était pas compris.

### Retiré
- **Le bouton « ＋ Importer SVG »** de l'onglet Meubles. Les meubles importés ne restaient que dans un seul navigateur, et les liens partagés qui les utilisaient s'affichaient incomplets chez les autres. Pour ajouter un meuble, placez son fichier SVG dans le dossier `meubles/` puis lancez `assembler-meubles.bat` (voir [meubles/LISEZMOI.md](meubles/LISEZMOI.md)). Les meubles importés auparavant n'apparaissent plus.

### Pour les contributeurs
- Les blasons de la galerie sont maintenant dans leur propre fichier, `js/galerie.js`.
- Nouvelle page de test, [`outils/test-blasonnement.html`](outils/test-blasonnement.html), à ouvrir dans le navigateur. Elle vérifie que chaque blason de la galerie est relu à l'identique par la page « Blasonnement ».
- Nettoyage du code : suppression de la compatibilité avec le tout premier format de sauvegarde, et de réglages de développement cachés dans l'adresse de la page (`?tab=`, `?path=`, `?cat=`).

## Version 1.0

Première version publiée : éditeur de blasons, page « Blasonnement », galerie de 44 blasons historiques, exports SVG et PNG en haute résolution, lien de partage.
