// Editorial photography for the storefront, hotlinked from Pexels (free to use,
// hotlinking permitted). Swap these for your own shoot when you have one.
export function pexels(id, width = 1200) {
  return `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
}

export function srcSet(id, widths = [480, 800, 1200, 1800]) {
  return widths.map((w) => `${pexels(id, w)} ${w}w`).join(", ");
}

export const LOOKS = {
  hoodiePair: { id: 8346261, alt: "Two models leaning together in black and white oversized hoodies" },
  openShirt: { id: 3214809, alt: "Seated model in an open black overshirt and white tee, tattooed forearms" },
  jacketDetail: { id: 6616649, alt: "Close crop of three layered overshirts in cream, grey and olive" },
  studioBack: { id: 12738124, alt: "Model from behind in a black tee and tapered trousers, jacket in hand" },
  studioSide: { id: 12738118, alt: "Model in profile wearing a black track jacket and cuffed joggers" },
  denimStreet: { id: 31988321, alt: "Model on a city street in a light-wash denim trucker jacket and jeans" },
  whiteTees: { id: 9775889, alt: "Four models in heavyweight white tees and denim against a white wall" },
  beigeHoodies: { id: 5840463, alt: "Two models in sand and white hoodies on a dune" },
  greyShirt: { id: 31618286, alt: "Model in a stone-grey casual shirt leaning against a textured wall" },
  jeansCrop: { id: 16069736, alt: "Cropped view of relaxed light-wash jeans and black trainers" },
  tracksuit: { id: 15868727, alt: "Model in a pale grey panelled tracksuit on a black backdrop" },
  leatherJacket: { id: 31696292, alt: "Model in a black faux-leather jacket and white tee on the street" },
};

// The storefront's real categories (from the product catalogue).
export const CATEGORY_TILES = [
  { label: "Jackets", look: LOOKS.denimStreet, span: "md:col-span-5 md:row-span-2" },
  { label: "T-Shirts", look: LOOKS.whiteTees, span: "md:col-span-7" },
  { label: "Hoodies", look: LOOKS.beigeHoodies, span: "md:col-span-4" },
  { label: "Shirts", look: LOOKS.greyShirt, span: "md:col-span-3" },
  { label: "Jeans", look: LOOKS.jeansCrop, span: "md:col-span-7", position: "center 70%" },
  { label: "Joggers", look: LOOKS.tracksuit, span: "md:col-span-5", position: "center 35%" },
];
