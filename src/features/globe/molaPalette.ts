// Transcripción literal de la tabla "Colorshade Look-up Table" enlazada por
// USGS desde Mars MGS MOLA Global Color Shaded Relief 463m.
// Start_elev está en metros sobre el areoide; no es una lectura de píxeles JPEG.
export const MOLA_PALETTE: readonly (readonly [meters: number, red: number, green: number, blue: number])[] = [
  [-9000, 104, 38, 103],
  [-8000, 129, 38, 152],
  [-7000, 130, 38, 199],
  [-6000, 76, 38, 211],
  [-5000, 38, 62, 223],
  [-4000, 38, 134, 235],
  [-3000, 38, 230, 170],
  [-2000, 66, 225, 38],
  [-1000, 148, 239, 38],
  [0, 243, 254, 38],
  [1000, 254, 188, 63],
  [2000, 240, 147, 67],
  [3000, 226, 111, 69],
  [4000, 212, 81, 72],
  [5000, 190, 107, 91],
  [6000, 168, 119, 105],
  [7000, 177, 130, 116],
  [8000, 186, 141, 128],
  [9000, 194, 153, 141],
  [10000, 203, 166, 155],
  [11000, 211, 179, 170],
  [12000, 221, 193, 185],
  [13000, 229, 208, 201],
  [14000, 238, 223, 218],
  [15000, 246, 238, 236],
  [16000, 248, 241, 239],
  [17000, 249, 244, 243],
  [18000, 252, 249, 249],
  [19000, 255, 255, 255],
  [20000, 218, 253, 255],
  [21000, 181, 251, 254],
]

export const MOLA_LOOKUP_URL = 'https://astrogeology.usgs.gov/ckan/dataset/0c30e797-b7d7-4d06-87c2-d3b01abcd797/resource/4e216958-91b2-4a81-b050-fad800236c95/download/molateam_contour_31rgb_steps.csv'
export const MOLA_LEGEND_URL = 'https://astrogeology.usgs.gov/ckan/dataset/0c30e797-b7d7-4d06-87c2-d3b01abcd797/resource/3ab79e40-f5ac-4d80-9483-eee5980c9ce2/download/colorhillshade_mola_lut.gif'

// Bandas discretas: no interpolar RGB ni sugerir cotas deducibles de píxeles.
export const molaGradient = `linear-gradient(to right, ${MOLA_PALETTE.map(([, red, green, blue], index) =>
  `rgb(${red} ${green} ${blue}) ${(index / MOLA_PALETTE.length * 100).toFixed(2)}% ${((index + 1) / MOLA_PALETTE.length * 100).toFixed(2)}%`).join(', ')})`
