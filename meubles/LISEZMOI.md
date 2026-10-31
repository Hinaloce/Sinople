# Les meubles de l'Atelier d'héraldique

Chaque fichier `.svg` de ce dossier est un meuble (ou une position d'un meuble).
Vous pouvez les retoucher, les remplacer ou en ajouter de nouveaux avec Inkscape,
Illustrator ou n'importe quel éditeur vectoriel.

## Après chaque modification

Double-cliquez sur **`assembler-meubles.bat`** (à la racine du projet), puis rechargez la
page. Le script regroupe tous les SVG de ce dossier dans `js/meubles-bundle.js`, le seul
fichier que le navigateur peut lire quand l'application est ouverte en double-clic.

Pour essayer un fichier sans relancer le script, utilisez le bouton
**« ＋ Importer SVG »** de l'onglet Meubles. Le meuble importé est conservé dans
le navigateur.

## Structure d'un fichier

L'application recolore elle-même les meubles. Les couleurs du fichier sont donc ignorées.
Ce qui compte, ce sont les **calques** (ou groupes), reconnus par leur nom de calque
Inkscape ou par leur `id` :

| Calque    | Rôle | Couleur à l'écran |
|-----------|------|-------------------|
| `corps`   | La silhouette. Tout ce qui n'est dans aucun calque y est rangé. | Émail du meuble |
| `langue`  | Facultatif. N'apparaît que si la langue est activée. | Émail choisi (lampassé, langué) |
| `armes`   | Facultatif : griffes, serres, défenses… Le bec, les pattes, les cornes (ou bois), les sabots et la crête ont chacun leur calque (voir plus bas). | Émail du meuble, ou émail choisi (armé, défendu…) |
| `details` | Traits intérieurs : yeux, crinière, plumes, nervures… | Couleur de contraste automatique |
| `peau`    | Facultatif : visage, mains, torse des personnages. | Émail du meuble, ou l'une des quatre carnations choisies |
| `couronne` | Facultatif. Dessinée seulement si « couronné » est activé. | Émail choisi (couronné) |
| `bec`, `membres`, `cornes`, `sabots`, `crete` | Facultatifs : particularités d'un autre émail que le corps. Toujours dessinées. | Émail du meuble, ou émail choisi (becqué, membré, accorné, onglé, crêté) |

Un meuble peut cumuler ces calques : le blasonnement réunit ceux qui ont le même émail
(« couronné et becqué d'or, membré de gueules »). Le terme se change avec `data-<calque>-terme`
(par exemple `data-membres-terme="patté"`), et le nom affiché dans l'éditeur avec `data-<calque>-nom`
(la tête de Maure range son bandeau dans `crete`, avec `data-crete-nom="Tortil"` et `data-crete-terme="tortillé"`).

Règles simples :

- Dessinez des **formes pleines**. Une forme avec `fill: none` et un contour est
  traitée comme un **trait** : elle garde son épaisseur et prend la couleur du calque.
- Le **contour noir** autour du meuble est ajouté automatiquement. Inutile de le dessiner.
- Les trous s'obtiennent avec la règle de remplissage « pair-impair » (`fill-rule: evenodd`)
  ou par combinaison de chemins.
- N'importe quel format de page convient : le dessin est recadré dans un carré.
  Les animaux regardent vers la **gauche** (la dextre héraldique). L'option « contourné »
  les retourne.
- Les clones (`<use>`), les dégradés et les filtres ne sont pas pris en charge. Convertissez
  les objets en chemins (Inkscape : *Chemin › Objet en chemin*).

## Mode encre : garder les traits noirs du dessin

Par défaut, l'application ignore toutes les couleurs du fichier. Avec l'attribut
`data-encre="oui"` sur la balise `<svg>`, elle garde le dessin au trait :

- une forme **sans couleur** prend l'émail de son calque ;
- le **noir** (`#000`) devient l'encre : contours et traits intérieurs, avec leur épaisseur ;
- les **tons chair** (`#eabfa2`, `#fd9863`, `#fad398`, `#ffcc99`) deviennent la peau : émail du meuble par défaut,
  ou carnation choisie ; les cheveux bruns (`#725a42`, `#4f1a00`) prennent l'émail du meuble ;
- toute **autre couleur explicite** est gardée telle quelle (par exemple le blanc des yeux) ;
- les contours sans couleur précisée sont tracés à l'encre.

Sur un meuble de sable, les traits intérieurs passent en gris clair pour rester visibles.
Ce mode convient aux dessins détaillés, comme ceux du dossier `meubles_V2`.

## Métadonnées (attributs de la balise `<svg>`)

Dans Inkscape : *Édition › Éditeur XML*, sélectionnez le nœud `svg` racine.

| Attribut | Exemple | Rôle |
|----------|---------|------|
| `data-meuble` | `lion` | Identifiant. Les fichiers qui ont le même identifiant sont des **positions** d'un même meuble. |
| `data-nom` | `Lion` | Nom affiché |
| `data-categorie` | `animaux` | `animaux`, `oiseaux`, `aquatiques`, `fabuleux`, `corps`, `vegetaux`, `astres`, `objets`, ou une catégorie nouvelle |
| `data-singulier` / `data-pluriel` | `lion` / `lions` | Pour le blasonnement |
| `data-genre` | `m` ou `f` | Accords (« un lion », « une aigle armée ») |
| `data-article` | `defini` | Article défini quand le meuble est seul dans le champ : « au lion », « à l'aigle » (sinon « à un… », « à une… ») |
| `data-renverse` | `versé` | Terme employé quand le meuble est tête en bas (par défaut `renversé` ; le croissant est « versé ») |
| `data-mouvant` | `flancs` | Meuble « mouvant » d'office (pont, haie, arc-en-ciel, crancelin) : `flancs` l'étend d'un flanc à l'autre de l'écu. Le blasonnement ne le dit pas ; dans l'éditeur, le choix « Mouvant » permet de le désactiver ou de choisir un autre bord (chef, pointe, flanc, canton, trait) |
| `data-ordre` | `3` | Rang dans la liste |
| `data-variante` | `passant` | Identifiant de la position |
| `data-variante-nom` | `Passant` | Nom affiché de la position |
| `data-adjectif` | `passant\|passants` | Ajouté au blasonnement (singulier\|pluriel). Vide pour la position par défaut. |
| `data-defaut` | `oui` | Force la position proposée par défaut |
| `data-armes-nom` | `Griffes` | Libellé de l'option du calque `armes` |
| `data-armes-terme` | `armé` | Terme héraldique (accordé automatiquement : armée, armés…) |
| `data-langue-terme` | `lampassé` | `lampassé` pour les quadrupèdes, `langué` pour les oiseaux |
| `data-couleur-singulier` / `-pluriel` | `tourteau` | Nom quand le meuble est de couleur (besant → tourteau) |
| `data-encre` | `oui` | Garde les traits noirs du dessin (voir ci-dessus) |
| `data-auteur` / `data-source` / `data-licence` | | Origine du dessin, à conserver pour les crédits |

Nom de fichier conseillé : `identifiant--position.svg` (ex. `lion--passant.svg`),
ou `identifiant.svg` pour un meuble sans variante.

Un modèle vide prêt à l'emploi se trouve dans `outils/modele-meuble.svg`.

## Où trouver de beaux dessins ?

- Dessiner ou redessiner dans **Inkscape** (gratuit), en décalquant une image de référence
  placée dans un calque à part, que vous supprimez ensuite.
- **Wikimedia Commons** propose de nombreux meubles héraldiques en SVG. Vérifiez la licence de
  chaque fichier : beaucoup sont sous CC BY-SA, ce qui impose de créditer l'auteur.
- Vectoriser une image matricielle : *Chemin › Vectoriser un objet matriciel* dans Inkscape,
  puis nettoyer et séparer la langue et les griffes dans leurs calques.
