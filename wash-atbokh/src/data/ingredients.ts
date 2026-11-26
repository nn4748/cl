import type { Bi } from '../i18n/types'

export type IngredientGroup = 'protein' | 'grain' | 'veg' | 'dairy' | 'spice' | 'pantry' | 'fruit' | 'herb'

export interface Ingredient {
  id: string
  name: Bi
  /** Extra spellings people actually type, in both scripts. */
  aliases?: string[]
  group: IngredientGroup
}

/**
 * Basics most kitchens already have. When the user keeps "I have the basics"
 * on, recipes treat these as available and they never count as missing.
 */
export const BASIC_IDS = ['salt', 'water', 'oil', 'black_pepper'] as const

export const INGREDIENTS: Ingredient[] = [
  // Proteins
  { id: 'chicken', name: { ar: 'دجاج', en: 'Chicken' }, aliases: ['دجاجه', 'فراخ', 'صدور دجاج', 'chicken breast', 'chicken thighs'], group: 'protein' },
  { id: 'meat', name: { ar: 'لحم', en: 'Lamb or beef' }, aliases: ['لحم غنم', 'لحم بقر', 'لحمة', 'lamb', 'beef', 'mutton', 'meat'], group: 'protein' },
  { id: 'eggs', name: { ar: 'بيض', en: 'Eggs' }, aliases: ['بيضه', 'بيضة', 'egg'], group: 'protein' },
  { id: 'lentils', name: { ar: 'عدس', en: 'Red lentils' }, aliases: ['عدس احمر', 'عدس مجروش', 'lentil', 'lentils'], group: 'grain' },

  // Grains & doughs
  { id: 'rice', name: { ar: 'رز', en: 'Rice' }, aliases: ['ارز', 'أرز', 'رز بسمتي', 'basmati', 'rice'], group: 'grain' },
  { id: 'jareesh', name: { ar: 'جريش', en: 'Cracked wheat (jareesh)' }, aliases: ['جريش', 'قمح مجروش', 'jareesh', 'jerish', 'cracked wheat', 'bulgur'], group: 'grain' },
  { id: 'flour', name: { ar: 'طحين', en: 'Flour' }, aliases: ['دقيق', 'طحين ابيض', 'flour', 'plain flour'], group: 'grain' },
  { id: 'vermicelli', name: { ar: 'شعيرية', en: 'Vermicelli' }, aliases: ['شعيريه', 'vermicelli', 'noodles'], group: 'grain' },
  { id: 'bread', name: { ar: 'خبز بر', en: 'Wholewheat flatbread' }, aliases: ['خبز', 'خبز بر', 'تميس', 'عيش', 'bread', 'flatbread', 'tamees'], group: 'grain' },
  { id: 'yeast', name: { ar: 'خميرة', en: 'Yeast' }, aliases: ['خميره', 'yeast'], group: 'pantry' },

  // Vegetables
  { id: 'onion', name: { ar: 'بصل', en: 'Onion' }, aliases: ['بصله', 'بصلة', 'onions'], group: 'veg' },
  { id: 'tomato', name: { ar: 'طماطم', en: 'Tomatoes' }, aliases: ['طماطه', 'بندوره', 'tomato', 'tomatoes'], group: 'veg' },
  { id: 'garlic', name: { ar: 'ثوم', en: 'Garlic' }, aliases: ['ثومة', 'garlic'], group: 'veg' },
  { id: 'carrot', name: { ar: 'جزر', en: 'Carrots' }, aliases: ['جزره', 'carrot', 'carrots'], group: 'veg' },
  { id: 'potato', name: { ar: 'بطاطس', en: 'Potatoes' }, aliases: ['بطاطا', 'بطاطس', 'potato', 'potatoes'], group: 'veg' },
  { id: 'zucchini', name: { ar: 'كوسا', en: 'Zucchini' }, aliases: ['كوسه', 'كوسة', 'courgette', 'zucchini'], group: 'veg' },
  { id: 'bell_pepper', name: { ar: 'فلفل رومي', en: 'Bell pepper' }, aliases: ['فلفل حلو', 'فليفله', 'capsicum', 'pepper', 'bell pepper'], group: 'veg' },
  { id: 'green_chili', name: { ar: 'فلفل حار', en: 'Green chili' }, aliases: ['فلفل اخضر حار', 'حار', 'chili', 'chilli', 'jalapeno'], group: 'veg' },

  // Dairy
  { id: 'yogurt', name: { ar: 'زبادي', en: 'Yogurt' }, aliases: ['لبن زبادي', 'روب', 'yoghurt', 'yogurt', 'laban'], group: 'dairy' },
  { id: 'milk', name: { ar: 'حليب', en: 'Milk' }, aliases: ['حليب كامل', 'milk'], group: 'dairy' },
  { id: 'cream', name: { ar: 'قشطة', en: 'Cream (qishta)' }, aliases: ['قشطه', 'كريمة', 'qishta', 'cream'], group: 'dairy' },
  { id: 'ghee', name: { ar: 'سمن', en: 'Ghee' }, aliases: ['سمن بلدي', 'سمنة', 'ghee'], group: 'dairy' },
  { id: 'butter', name: { ar: 'زبدة', en: 'Butter' }, aliases: ['زبده', 'butter'], group: 'dairy' },
  { id: 'cheese', name: { ar: 'جبن', en: 'Cheese' }, aliases: ['جبنه', 'جبنة', 'cheese'], group: 'dairy' },

  // Spices & pantry
  { id: 'kabsa_spice', name: { ar: 'بهارات كبسة', en: 'Kabsa spice mix' }, aliases: ['بهارات', 'بهار', 'بزار', 'baharat', 'bzar', 'spice mix'], group: 'spice' },
  { id: 'loomi', name: { ar: 'لومي', en: 'Dried lime (loomi)' }, aliases: ['لومي', 'ليمون اسود', 'black lime', 'dried lime', 'loomi'], group: 'spice' },
  { id: 'cardamom', name: { ar: 'هيل', en: 'Cardamom' }, aliases: ['حبهان', 'هيل', 'cardamom'], group: 'spice' },
  { id: 'cinnamon', name: { ar: 'قرفة', en: 'Cinnamon' }, aliases: ['قرفه', 'دارسين', 'cinnamon'], group: 'spice' },
  { id: 'cumin', name: { ar: 'كمون', en: 'Cumin' }, aliases: ['كمّون', 'cumin'], group: 'spice' },
  { id: 'turmeric', name: { ar: 'كركم', en: 'Turmeric' }, aliases: ['كركم', 'عرق اصفر', 'turmeric'], group: 'spice' },
  { id: 'saffron', name: { ar: 'زعفران', en: 'Saffron' }, aliases: ['زعفران', 'saffron'], group: 'spice' },
  { id: 'tomato_paste', name: { ar: 'معجون طماطم', en: 'Tomato paste' }, aliases: ['صلصة', 'صلصه', 'معجون', 'tomato paste', 'puree'], group: 'pantry' },
  { id: 'sugar', name: { ar: 'سكر', en: 'Sugar' }, aliases: ['سكر', 'sugar'], group: 'pantry' },
  { id: 'honey', name: { ar: 'عسل', en: 'Honey' }, aliases: ['عسل', 'honey'], group: 'pantry' },
  { id: 'date_syrup', name: { ar: 'دبس تمر', en: 'Date syrup (dibs)' }, aliases: ['دبس', 'سيلان', 'date syrup', 'dibs'], group: 'pantry' },
  { id: 'raisins', name: { ar: 'زبيب', en: 'Raisins' }, aliases: ['زبيب', 'raisins', 'sultanas'], group: 'fruit' },
  { id: 'almonds', name: { ar: 'لوز', en: 'Almonds' }, aliases: ['لوز', 'مكسرات', 'almonds', 'nuts'], group: 'fruit' },
  { id: 'lemon', name: { ar: 'ليمون', en: 'Lemon' }, aliases: ['ليمونه', 'ليمون اخضر', 'lime', 'lemon'], group: 'fruit' },
  { id: 'banana', name: { ar: 'موز', en: 'Bananas' }, aliases: ['موزه', 'banana', 'bananas'], group: 'fruit' },
  { id: 'dates', name: { ar: 'تمر', en: 'Dates' }, aliases: ['تمور', 'رطب', 'dates'], group: 'fruit' },

  // Herbs
  { id: 'coriander', name: { ar: 'كزبرة', en: 'Fresh coriander' }, aliases: ['كزبره', 'cilantro', 'coriander'], group: 'herb' },
  { id: 'parsley', name: { ar: 'بقدونس', en: 'Parsley' }, aliases: ['بقدونس', 'parsley'], group: 'herb' },

  // Basics (assumed when "I have the basics" is on)
  { id: 'salt', name: { ar: 'ملح', en: 'Salt' }, group: 'pantry' },
  { id: 'water', name: { ar: 'ماء', en: 'Water' }, group: 'pantry' },
  { id: 'oil', name: { ar: 'زيت', en: 'Cooking oil' }, aliases: ['زيت نباتي', 'زيت طبخ', 'oil'], group: 'pantry' },
  { id: 'black_pepper', name: { ar: 'فلفل أسود', en: 'Black pepper' }, aliases: ['فلفل اسود', 'pepper'], group: 'spice' },
]

export const INGREDIENT_MAP: Record<string, Ingredient> = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]))

/** Quick-add examples shown under the input. */
export const QUICK_PICKS = ['rice', 'chicken', 'tomato', 'onion', 'yogurt', 'flour', 'lentils', 'eggs', 'potato', 'milk']
