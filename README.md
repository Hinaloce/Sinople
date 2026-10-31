# Sinople

**Composez votre blason selon les règles de l'art.**

Sinople est une application web d'héraldique, entièrement en français. Elle permet de composer des armoiries, d'écrire leur blasonnement et de les exporter en image. Elle vérifie aussi qu'elles respectent les règles du blason.

👉 **[Essayer Sinople en ligne](https://hinaloce.github.io/Sinople/)**

## Ce que l'on peut faire

### Éditer un blason
- Choisir la forme de l'écu, le champ et ses **partitions** (parti, coupé, tranché, écartelé, tiercé…) avec leurs **traits** (ondé, engrêlé, denché…).
- Ajouter des **pièces** (fasce, pal, chef, bande, bordure…) et des **meubles** : près de 400 dessins (lions, aigles, fleurs de lis, étoiles, coquilles, tours…) avec leurs positions (passant, rampant, contourné…) et leurs attributs (armé, lampassé, couronné…).
- Utiliser tous les **émaux** : métaux, couleurs et fourrures (hermine, vair et leurs variantes).
- Imbriquer les éléments : une pièce peut être chargée de meubles, un quartier peut recevoir son propre blason.
- Lire le **blasonnement** généré automatiquement, accords grammaticaux compris (« une aigle armée », « trois lions passants »).
- Respecter la **règle de contrariété** (pas de métal sur métal ni de couleur sur couleur). Le *mode strict* empêche de l'enfreindre et des avertissements signalent les écarts.
- Tirer un **blason au hasard**, toujours conforme aux règles.
- Annuler, rétablir, zoomer et cliquer directement sur une partie de l'écu pour la modifier.

### Blasonner en une phrase
Écrivez un blasonnement, par exemple *« D'azur à trois fleurs de lis d'or »* ou *« Coupé d'or et de gueules, à la fasce ondée d'argent »*, et l'application dessine l'écu correspondant. Vous pouvez ensuite le reprendre dans l'éditeur.

### Galerie
Des armoiries historiques (Royaume de France, Bretagne, Normandie, Guyenne…) accompagnées d'une courte notice, à ouvrir dans l'éditeur.

### Partager
- Exporter le blason en **SVG** ou en **PNG**.
- **Copier un lien** qui contient tout le blason : la personne qui l'ouvre voit exactement le même écu.
- Le blason en cours est conservé dans le navigateur d'une visite à l'autre.

## Utiliser Sinople sur son ordinateur

Il n'y a rien à installer : téléchargez le projet (bouton **Code › Download ZIP** en haut de cette page), décompressez-le, puis ouvrez `index.html` dans votre navigateur. L'application fonctionne aussi sans connexion internet.

## Ajouter ou modifier des meubles

Les meubles sont des fichiers SVG rangés dans le dossier [`meubles/`](meubles/). On peut les retoucher ou en ajouter avec Inkscape ou un autre éditeur vectoriel. Après chaque modification, double-cliquez sur `assembler-meubles.bat` (Windows), puis rechargez la page.

Le guide complet (calques, couleurs, métadonnées) se trouve dans [`meubles/LISEZMOI.md`](meubles/LISEZMOI.md). Un modèle vide est fourni dans [`outils/modele-meuble.svg`](outils/modele-meuble.svg).

## Organisation du projet

| Dossier ou fichier | Contenu |
|---|---|
| `index.html` | La page de l'application |
| `css/` | La mise en forme |
| `js/` | Le code : données héraldiques, géométrie de l'écu, rendu, règles et blasonnement, lecture des blasonnements, galerie |
| `meubles/` | Les dessins des meubles, un fichier SVG par meuble ou par position |
| `outils/` | Le script qui regroupe les meubles dans `js/meubles-bundle.js`, et le modèle de meuble |

Le projet est écrit en HTML, CSS et JavaScript, sans bibliothèque ni étape de compilation.

## Crédits

Les dessins des meubles proviennent de la collection d'[Armoria](https://github.com/Azgaar/Armoria), qui les a rassemblés à partir de [WappenWiki](http://wappenwiki.org), de [Wikimedia Commons](https://commons.wikimedia.org) et d'autres sources. Ils sont publiés sous diverses licences libres (CC BY-NC-SA, CC0, CC BY-SA, GNU FDL…).

Une partie de ces dessins est sous licence **CC BY-NC-SA** et interdit tout usage commercial. L'auteur, la source et la licence de chaque fichier sont listés dans [`meubles/CREDITS.md`](meubles/CREDITS.md).
