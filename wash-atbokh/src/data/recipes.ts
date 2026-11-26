import type { Bi } from '../i18n/types'
import type { UnitId } from './units'

export type Role = 'core' | 'support' | 'optional' | 'basic'
export type Tag = 'quick' | 'family' | 'guests' | 'kids' | 'light' | 'breakfast' | 'sweet' | 'comfort'
export type ArtId =
  | 'kabsa'
  | 'jareesh'
  | 'marqooq'
  | 'saleeg'
  | 'adas'
  | 'shakshouka'
  | 'luqaimat'
  | 'masoob'
  | 'balaleet'
  | 'salona'

export interface Substitute {
  /** A catalog ingredient that can stand in. */
  id?: string
  /** How to use it, or a free-text alternative when there is no catalog item. */
  note: Bi
}

export interface RecipeIngredient {
  id: string
  qty?: number
  unit: UnitId
  role: Role
  /** Extra detail such as "basmati" or "cut in pieces". */
  note?: Bi
  subs?: Substitute[]
}

export interface Step {
  title: Bi
  body: Bi
  /** Duration in minutes for steps that benefit from a timer. */
  minutes?: number
}

export interface Recipe {
  id: string
  title: Bi
  region: Bi
  intro: Bi
  servings: number
  prepMin: number
  cookMin: number
  tags: Tag[]
  ingredients: RecipeIngredient[]
  steps: Step[]
  art: ArtId
}

const basics: RecipeIngredient[] = [
  { id: 'salt', unit: 'taste', role: 'basic' },
  { id: 'oil', qty: 3, unit: 'tbsp', role: 'basic' },
  { id: 'water', unit: 'taste', role: 'basic' },
]

export const RECIPES: Recipe[] = [
  {
    id: 'chicken-kabsa',
    art: 'kabsa',
    title: { ar: 'كبسة دجاج', en: 'Chicken Kabsa' },
    region: { ar: 'نجد · سفرة الجمعة', en: 'Najd · the Friday table' },
    intro: {
      ar: 'رز بسمتي يشرب مرق الدجاج والبهارات حتى يصير ذهبي، ودجاج محمّر فوقه. هي الطبخة اللي تجمع البيت.',
      en: 'Basmati rice cooked in a spiced chicken broth until it turns golden, with the roasted chicken laid on top. The dish that brings the whole house to the table.',
    },
    servings: 5,
    prepMin: 35,
    cookMin: 75,
    tags: ['family', 'guests'],
    ingredients: [
      { id: 'chicken', qty: 1.2, unit: 'kg', role: 'core', note: { ar: 'مقطّع أرباع', en: 'cut into quarters' }, subs: [{ id: 'meat', note: { ar: 'استخدم لحم، وزد وقت السلق إلى ساعة ونص', en: 'Use lamb or beef and simmer for about 90 minutes instead' } }] },
      { id: 'rice', qty: 3, unit: 'cup', role: 'core', note: { ar: 'بسمتي', en: 'basmati' } },
      { id: 'onion', qty: 2, unit: 'piece', role: 'support' },
      { id: 'tomato', qty: 3, unit: 'piece', role: 'support' },
      { id: 'tomato_paste', qty: 2, unit: 'tbsp', role: 'support', subs: [{ id: 'tomato', note: { ar: 'زد حبتين طماطم مبشورة', en: 'Grate in two extra tomatoes' } }] },
      { id: 'garlic', qty: 4, unit: 'clove', role: 'support' },
      { id: 'kabsa_spice', qty: 2, unit: 'tbsp', role: 'support', subs: [{ id: 'cumin', note: { ar: 'كمون وهيل وقرفة وفلفل أسود بالتساوي', en: 'Equal parts cumin, cardamom, cinnamon and black pepper' } }] },
      { id: 'loomi', qty: 2, unit: 'piece', role: 'optional', subs: [{ id: 'lemon', note: { ar: 'قشر ليمونة وعصيرها آخر السلق', en: 'Zest and juice of one lemon near the end of simmering' } }] },
      { id: 'carrot', qty: 1, unit: 'piece', role: 'optional', note: { ar: 'مبشور', en: 'grated' } },
      { id: 'cardamom', qty: 4, unit: 'pod', role: 'optional' },
      { id: 'raisins', qty: 0.25, unit: 'cup', role: 'optional' },
      { id: 'almonds', qty: 0.25, unit: 'cup', role: 'optional', subs: [{ note: { ar: 'أي مكسرات محمّصة أو بدونها', en: 'Any toasted nut, or skip it' } }] },
      ...basics,
    ],
    steps: [
      { title: { ar: 'انقع الرز', en: 'Soak the rice' }, body: { ar: 'اغسل الرز بالماء البارد حتى يصفى الماء، ثم انقعه وهو مغطى بالماء.', en: 'Rinse the rice in cold water until it runs clear, then leave it covered in water to soak.' }, minutes: 30 },
      { title: { ar: 'حمّر البصل', en: 'Brown the onions' }, body: { ar: 'في قدر كبير، قلّب البصل المقطّع في الزيت على نار متوسطة حتى يذبل ويصير لونه ذهبي.', en: 'In a large pot, cook the sliced onions in the oil over medium heat until soft and golden.' }, minutes: 8 },
      { title: { ar: 'أضف الطماطم والبهارات', en: 'Add tomatoes and spices' }, body: { ar: 'أضف الثوم والطماطم المقطعة والمعجون والبهارات والجزر، وقلّب حتى تتماسك الصلصة.', en: 'Stir in the garlic, chopped tomatoes, paste, spices and carrot until it thickens into a sauce.' }, minutes: 5 },
      { title: { ar: 'شوّح الدجاج', en: 'Sear the chicken' }, body: { ar: 'أضف قطع الدجاج وقلّبها في الصلصة حتى يتغير لونها من كل الجهات.', en: 'Add the chicken and turn it in the sauce until it changes colour on all sides.' }, minutes: 6 },
      { title: { ar: 'اسلق الدجاج', en: 'Simmer the chicken' }, body: { ar: 'أضف ٦ أكواب ماء مع اللومي والهيل والملح، وغطّ القدر واتركه على نار هادئة حتى يستوي الدجاج.', en: 'Pour in about 6 cups of water with the loomi, cardamom and salt. Cover and simmer until the chicken is tender.' }, minutes: 40 },
      { title: { ar: 'حمّر الدجاج في الفرن', en: 'Roast the chicken' }, body: { ar: 'طلّع الدجاج من المرق وحطه في صينية، وادخله الفرن على شواية عالية حتى يحمر وجهه. يمديك تبدأ الخطوة الجاية في نفس الوقت.', en: 'Lift the chicken out of the broth onto a tray and roast under a hot grill until browned. You can start the next step at the same time.' }, minutes: 15 },
      { title: { ar: 'اطبخ الرز في المرق', en: 'Cook the rice in the broth' }, body: { ar: 'صفّ الرز وأضفه للمرق. لازم يغطيه المرق بقد إصبع. خله يغلي، ثم هدّ النار وغطّ القدر.', en: 'Drain the rice and add it to the broth, which should cover it by about one finger. Bring to a boil, then turn the heat down low and cover.' }, minutes: 25 },
      { title: { ar: 'حمّص الزبيب واللوز', en: 'Toast the raisins and almonds' }, body: { ar: 'في مقلاة صغيرة مع ملعقة سمن أو زيت، قلّب اللوز حتى يتحمّص، ثم أضف الزبيب حتى ينتفخ.', en: 'In a small pan with a spoon of ghee or oil, toast the almonds, then add the raisins until they plump.' }, minutes: 3 },
      { title: { ar: 'غرّف وقدّم', en: 'Plate and serve' }, body: { ar: 'افرد الرز في صحن التقديم، ورتّب الدجاج فوقه، ووزّع عليه الزبيب واللوز. قدّمه مع سلطة أو دقوس.', en: 'Spread the rice on a platter, set the chicken on top and scatter over the raisins and almonds. Serve with salad or dagoos (spicy tomato salsa).' } },
    ],
  },
  {
    id: 'jareesh',
    art: 'jareesh',
    title: { ar: 'جريش', en: 'Jareesh' },
    region: { ar: 'القصيم ونجد · أكلة الشتاء', en: 'Qassim & Najd · winter comfort' },
    intro: {
      ar: 'قمح مجروش يطبخ على مهله حتى يصير كريمي، وتتوّجه تحميرة بصل بالسمن. دافي ومُشبع ويليق بالضيوف.',
      en: 'Cracked wheat cooked slowly into something creamy, finished with onions fried dark in ghee. Warming, filling and fit for guests.',
    },
    servings: 4,
    prepMin: 35,
    cookMin: 75,
    tags: ['comfort', 'guests', 'family'],
    ingredients: [
      { id: 'jareesh', qty: 1.5, unit: 'cup', role: 'core' },
      { id: 'chicken', qty: 500, unit: 'g', role: 'support', subs: [{ id: 'meat', note: { ar: 'لحم بدال الدجاج، وزد السلق ١٥ دقيقة', en: 'Use meat instead and simmer 15 minutes longer' } }] },
      { id: 'milk', qty: 2, unit: 'cup', role: 'support' },
      { id: 'yogurt', qty: 1, unit: 'cup', role: 'support', subs: [{ id: 'milk', note: { ar: 'زد نص كوب حليب مع عصرة ليمون', en: 'Add half a cup more milk with a squeeze of lemon' } }] },
      { id: 'onion', qty: 2, unit: 'piece', role: 'support' },
      { id: 'ghee', qty: 3, unit: 'tbsp', role: 'support', subs: [{ id: 'butter', note: { ar: 'زبدة بنفس الكمية', en: 'The same amount of butter' } }] },
      { id: 'cumin', qty: 1, unit: 'tsp', role: 'optional' },
      { id: 'loomi', qty: 1, unit: 'piece', role: 'optional' },
      { id: 'green_chili', qty: 1, unit: 'piece', role: 'optional' },
      ...basics,
    ],
    steps: [
      { title: { ar: 'انقع الجريش', en: 'Soak the jareesh' }, body: { ar: 'اغسل الجريش جيداً وانقعه في ماء فاتر.', en: 'Rinse the jareesh well and soak it in warm water.' }, minutes: 30 },
      { title: { ar: 'اسلق الدجاج', en: 'Make the broth' }, body: { ar: 'اسلق الدجاج مع نص بصلة واللومي والملح في ٦ أكواب ماء، ثم شيل الدجاج وفتّته.', en: 'Simmer the chicken with half an onion, the loomi and salt in 6 cups of water. Lift it out and shred it.' }, minutes: 25 },
      { title: { ar: 'اطبخ الجريش', en: 'Cook the jareesh' }, body: { ar: 'صفّ الجريش وأضفه للمرق مع الكمون والدجاج المفتت. قلّبه كل شوي على نار هادئة حتى يتهرّى، وأضف ماء لو ثقل.', en: 'Drain the jareesh and add it to the broth with the cumin and shredded chicken. Stir often over low heat until soft, adding water if it gets too thick.' }, minutes: 40 },
      { title: { ar: 'أضف الحليب والزبادي', en: 'Stir in milk and yogurt' }, body: { ar: 'أضف الحليب ثم الزبادي وأنت تقلّب، واتركه يتسبّك على نار هادئة جداً.', en: 'Stir in the milk, then the yogurt, and let it thicken over very gentle heat.' }, minutes: 10 },
      { title: { ar: 'سوّ التحميرة', en: 'Fry the onion topping' }, body: { ar: 'قطّع البصل الباقي شرائح رفيعة وحمّره في السمن مع الفلفل الحار حتى يصير بني غامق ومقرمش.', en: 'Slice the remaining onion thinly and fry it in the ghee with the chili until deep brown and crisp.' }, minutes: 10 },
      { title: { ar: 'قدّم', en: 'Serve' }, body: { ar: 'اسكب الجريش في صحن عريض، واعمل في وسطه حفرة، وصبّ فيها التحميرة مع السمن.', en: 'Spoon the jareesh into a wide dish, make a well in the centre and pour in the onions and ghee.' } },
    ],
  },
  {
    id: 'marqooq',
    art: 'marqooq',
    title: { ar: 'مرقوق', en: 'Marqooq' },
    region: { ar: 'نجد · قدر واحد يكفي الكل', en: 'Najd · one pot for everyone' },
    intro: {
      ar: 'رقائق عجين رقيقة تنطبخ في مرق اللحم والخضار حتى يتشربه. أكلة بيوت، وتطلع أطيب في اليوم الثاني.',
      en: 'Thin sheets of dough cooked in a meat and vegetable stew until they soak it all up. Proper home food, and even better the next day.',
    },
    servings: 5,
    prepMin: 25,
    cookMin: 75,
    tags: ['family', 'comfort'],
    ingredients: [
      { id: 'flour', qty: 3, unit: 'cup', role: 'core' },
      { id: 'meat', qty: 750, unit: 'g', role: 'core', note: { ar: 'مكعبات بالعظم', en: 'bone-in chunks' }, subs: [{ id: 'chicken', note: { ar: 'دجاج، والسلق ٢٥ دقيقة فقط', en: 'Chicken works too; simmer for just 25 minutes' } }] },
      { id: 'zucchini', qty: 2, unit: 'piece', role: 'support', subs: [{ id: 'potato', note: { ar: 'زد حبة بطاطس', en: 'Add another potato' } }] },
      { id: 'potato', qty: 2, unit: 'piece', role: 'support' },
      { id: 'carrot', qty: 2, unit: 'piece', role: 'support' },
      { id: 'onion', qty: 2, unit: 'piece', role: 'support' },
      { id: 'tomato', qty: 3, unit: 'piece', role: 'support' },
      { id: 'tomato_paste', qty: 2, unit: 'tbsp', role: 'optional' },
      { id: 'garlic', qty: 3, unit: 'clove', role: 'optional' },
      { id: 'loomi', qty: 2, unit: 'piece', role: 'optional' },
      { id: 'kabsa_spice', qty: 1, unit: 'tbsp', role: 'optional' },
      { id: 'turmeric', qty: 1, unit: 'tsp', role: 'optional' },
      ...basics,
    ],
    steps: [
      { title: { ar: 'اعجن وريّح العجين', en: 'Knead and rest the dough' }, body: { ar: 'اعجن الطحين مع ملعقة زيت وملح وماء فاتر شوي شوي حتى يصير العجين لين وما يلصق، ثم غطّه واتركه يرتاح.', en: 'Knead the flour with a spoon of oil, salt and warm water added little by little until soft and not sticky. Cover and let it rest.' }, minutes: 20 },
      { title: { ar: 'شوّح اللحم والبصل', en: 'Brown the meat and onion' }, body: { ar: 'في قدر عميق، قلّب البصل في الزيت ثم أضف اللحم والبهارات والكركم حتى يتحمّر.', en: 'In a deep pot, soften the onion in oil, then add the meat, spice mix and turmeric and brown it.' }, minutes: 8 },
      { title: { ar: 'أضف الطماطم', en: 'Add the tomatoes' }, body: { ar: 'أضف الثوم والطماطم المقطعة والمعجون، وقلّب حتى تذبل الطماطم.', en: 'Add the garlic, chopped tomatoes and paste and cook until the tomatoes collapse.' }, minutes: 5 },
      { title: { ar: 'اسلق اللحم', en: 'Simmer the meat' }, body: { ar: 'غطّ اللحم بالماء بقد ٣ أصابع، وأضف اللومي المثقوب، وخلّه على نار هادئة.', en: 'Cover the meat by three fingers of water, add the pierced loomi and simmer gently.' }, minutes: 35 },
      { title: { ar: 'أضف الخضار', en: 'Add the vegetables' }, body: { ar: 'أضف البطاطس والجزر والكوسا مقطعة قطع كبيرة.', en: 'Add the potatoes, carrots and zucchini in large chunks.' }, minutes: 15 },
      { title: { ar: 'افرد العجين وأضفه', en: 'Roll and add the dough' }, body: { ar: 'افرد العجين رقيق جداً، وقطّعه مربعات، ونزّله في المرق وهو يغلي على دفعات وأنت تحرّك القدر بهدوء.', en: 'Roll the dough very thin, cut it into squares and drop them into the simmering stew in batches, nudging the pot gently.' }, minutes: 12 },
      { title: { ar: 'ريّحه وقدّم', en: 'Rest and serve' }, body: { ar: 'طفّ النار واترك القدر مغطى شوي حتى يثقل المرق، ثم قدّمه حار.', en: 'Turn off the heat and leave it covered so the stew thickens, then serve hot.' }, minutes: 5 },
    ],
  },
  {
    id: 'saleeg',
    art: 'saleeg',
    title: { ar: 'سليق', en: 'Saleeg' },
    region: { ar: 'الطائف والحجاز', en: 'Taif & the Hijaz' },
    intro: {
      ar: 'رز أبيض كريمي مطبوخ بمرق الدجاج والحليب، وفوقه دجاج محمّر وسمن. ناعم ومحبوب عند الصغار قبل الكبار.',
      en: 'Creamy white rice cooked in chicken broth and milk, topped with browned chicken and a spoon of ghee. Gentle, and loved by kids as much as grown-ups.',
    },
    servings: 4,
    prepMin: 10,
    cookMin: 70,
    tags: ['kids', 'comfort', 'guests'],
    ingredients: [
      { id: 'chicken', qty: 1, unit: 'kg', role: 'core' },
      { id: 'rice', qty: 2, unit: 'cup', role: 'core', note: { ar: 'رز مصري أو قصير', en: 'short-grain' } },
      { id: 'milk', qty: 3, unit: 'cup', role: 'core' },
      { id: 'ghee', qty: 3, unit: 'tbsp', role: 'support', subs: [{ id: 'butter', note: { ar: 'زبدة بنفس الكمية', en: 'The same amount of butter' } }] },
      { id: 'onion', qty: 1, unit: 'piece', role: 'support' },
      { id: 'cardamom', qty: 4, unit: 'pod', role: 'optional' },
      { id: 'cinnamon', qty: 1, unit: 'stick', role: 'optional' },
      { id: 'loomi', qty: 1, unit: 'piece', role: 'optional' },
      { id: 'black_pepper', unit: 'taste', role: 'basic' },
      ...basics,
    ],
    steps: [
      { title: { ar: 'اسلق الدجاج', en: 'Poach the chicken' }, body: { ar: 'اسلق الدجاج مع البصل والهيل والقرفة واللومي والملح في ٨ أكواب ماء.', en: 'Poach the chicken in 8 cups of water with the onion, cardamom, cinnamon, loomi and salt.' }, minutes: 35 },
      { title: { ar: 'صفّ المرق', en: 'Strain the broth' }, body: { ar: 'شيل الدجاج، وصفّ المرق واحتفظ به.', en: 'Lift out the chicken, then strain the broth and keep it.' } },
      { title: { ar: 'اطبخ الرز في المرق', en: 'Cook rice in the broth' }, body: { ar: 'اغسل الرز وأضفه لـ٥ أكواب من المرق، وقلّبه على نار متوسطة حتى يطرى.', en: 'Rinse the rice and add it to 5 cups of the broth. Stir over medium heat until it softens.' }, minutes: 15 },
      { title: { ar: 'أضف الحليب', en: 'Add the milk' }, body: { ar: 'صبّ الحليب على دفعات وأنت تقلّب باستمرار حتى يصير الرز كريمي وثقيل. لا تخليه يلصق.', en: 'Pour in the milk gradually, stirring constantly, until the rice is thick and creamy. Don’t let it catch.' }, minutes: 12 },
      { title: { ar: 'حمّر الدجاج', en: 'Brown the chicken' }, body: { ar: 'ادهن الدجاج بالسمن والفلفل الأسود، وحمّره في الفرن أو في مقلاة.', en: 'Brush the chicken with ghee and black pepper and brown it in the oven or a pan.' }, minutes: 10 },
      { title: { ar: 'قدّم', en: 'Serve' }, body: { ar: 'افرد السليق في صحن، وحط الدجاج فوقه، وصبّ عليه سمن حار.', en: 'Spread the saleeg on a platter, top with the chicken and pour over hot ghee.' } },
    ],
  },
  {
    id: 'shorbat-adas',
    art: 'adas',
    title: { ar: 'شوربة عدس', en: 'Lentil Soup' },
    region: { ar: 'كل بيت · خاصة في رمضان', en: 'Every home · especially in Ramadan' },
    intro: {
      ar: 'عدس أحمر بالكمون والليمون، ناعم ومتّزن. تخلص في نص ساعة وتدفّي.',
      en: 'Red lentils with cumin and lemon, smooth and balanced. Ready in half an hour, and warming.',
    },
    servings: 4,
    prepMin: 10,
    cookMin: 25,
    tags: ['quick', 'light', 'kids', 'family'],
    ingredients: [
      { id: 'lentils', qty: 1.5, unit: 'cup', role: 'core' },
      { id: 'onion', qty: 1, unit: 'piece', role: 'support' },
      { id: 'carrot', qty: 1, unit: 'piece', role: 'support', subs: [{ id: 'potato', note: { ar: 'حبة بطاطس تعطي نفس القوام', en: 'A potato gives the same body' } }] },
      { id: 'garlic', qty: 2, unit: 'clove', role: 'support' },
      { id: 'cumin', qty: 1.5, unit: 'tsp', role: 'support' },
      { id: 'lemon', qty: 1, unit: 'piece', role: 'support' },
      { id: 'turmeric', qty: 0.5, unit: 'tsp', role: 'optional' },
      { id: 'potato', qty: 1, unit: 'piece', role: 'optional' },
      { id: 'butter', qty: 1, unit: 'tbsp', role: 'optional' },
      ...basics,
    ],
    steps: [
      { title: { ar: 'شوّح الخضار', en: 'Soften the vegetables' }, body: { ar: 'قلّب البصل والثوم والجزر المقطع في الزيت حتى تذبل.', en: 'Cook the chopped onion, garlic and carrot in the oil until soft.' }, minutes: 6 },
      { title: { ar: 'أضف العدس', en: 'Add the lentils' }, body: { ar: 'أضف العدس المغسول والكمون والكركم و٥ أكواب ماء، وخلّه يغلي ثم هدّ النار.', en: 'Add the rinsed lentils, cumin, turmeric and 5 cups of water. Bring to a boil, then lower the heat.' }, minutes: 20 },
      { title: { ar: 'اخلطها', en: 'Blend it' }, body: { ar: 'اخلط الشوربة بالخلاط اليدوي حتى تصير ناعمة.', en: 'Blend the soup with a stick blender until smooth.' } },
      { title: { ar: 'اضبط القوام', en: 'Adjust the texture' }, body: { ar: 'أضف ماء لو ثقلت، وذوّق الملح، وخلّها تغلي غلوة خفيفة مع الزبدة.', en: 'Loosen with water if needed, check the salt and bring back to a gentle bubble with the butter.' }, minutes: 3 },
      { title: { ar: 'قدّم مع الليمون', en: 'Serve with lemon' }, body: { ar: 'قدّمها حارة مع شرائح ليمون ورشة كمون.', en: 'Serve hot with lemon wedges and a pinch of cumin.' } },
    ],
  },
  {
    id: 'shakshouka',
    art: 'shakshouka',
    title: { ar: 'شكشوكة', en: 'Shakshouka' },
    region: { ar: 'فطور الويكند', en: 'The weekend breakfast' },
    intro: {
      ar: 'بيض يستوي على مهله في صلصة طماطم وفلفل. تطلع سريعة، وما تبي غير خبز حار.',
      en: 'Eggs gently set in a tomato and pepper sauce. Quick to make, and all it needs is warm bread.',
    },
    servings: 3,
    prepMin: 5,
    cookMin: 20,
    tags: ['quick', 'breakfast', 'kids', 'light'],
    ingredients: [
      { id: 'eggs', qty: 5, unit: 'piece', role: 'core' },
      { id: 'tomato', qty: 4, unit: 'piece', role: 'core', subs: [{ id: 'tomato_paste', note: { ar: '٣ ملاعق معجون مع كوب ماء', en: '3 tbsp paste loosened with a cup of water' } }] },
      { id: 'onion', qty: 1, unit: 'piece', role: 'support' },
      { id: 'garlic', qty: 2, unit: 'clove', role: 'support' },
      { id: 'bell_pepper', qty: 1, unit: 'piece', role: 'optional' },
      { id: 'green_chili', qty: 1, unit: 'piece', role: 'optional' },
      { id: 'cumin', qty: 0.5, unit: 'tsp', role: 'optional' },
      { id: 'parsley', unit: 'taste', role: 'optional', subs: [{ id: 'coriander', note: { ar: 'كزبرة بدال البقدونس', en: 'Coriander instead of parsley' } }] },
      { id: 'bread', qty: 3, unit: 'loaf', role: 'optional', note: { ar: 'للتقديم', en: 'to serve' } },
      ...basics,
    ],
    steps: [
      { title: { ar: 'ليّن البصل والفلفل', en: 'Soften onion and pepper' }, body: { ar: 'قلّب البصل والفلفل المقطع في الزيت على نار متوسطة.', en: 'Cook the chopped onion and pepper in the oil over medium heat.' }, minutes: 5 },
      { title: { ar: 'سبّك الصلصة', en: 'Reduce the sauce' }, body: { ar: 'أضف الثوم والطماطم المقطعة مكعبات والكمون والملح، وخلّها تتسبّك حتى تثقل.', en: 'Add the garlic, diced tomatoes, cumin and salt and cook down until thick.' }, minutes: 8 },
      { title: { ar: 'اكسر البيض', en: 'Crack in the eggs' }, body: { ar: 'سوّ حفر صغيرة في الصلصة واكسر فيها البيض، وغطّ المقلاة على نار هادئة حتى يستوي البياض.', en: 'Make little wells in the sauce, crack in the eggs, cover and cook gently until the whites set.' }, minutes: 5 },
      { title: { ar: 'زيّن وقدّم', en: 'Garnish and serve' }, body: { ar: 'رشّ البقدونس وقدّمها في المقلاة مع خبز حار.', en: 'Scatter over the parsley and bring the pan to the table with warm bread.' } },
    ],
  },
  {
    id: 'luqaimat',
    art: 'luqaimat',
    title: { ar: 'لقيمات', en: 'Luqaimat' },
    region: { ar: 'الخليج · مع القهوة', en: 'Across the Gulf · with coffee' },
    intro: {
      ar: 'كرات عجين مقلية مقرمشة من برّا وطرية من داخل، يغطيها دبس التمر. تخلص قبل ما تبرد.',
      en: 'Fried dough balls, crisp outside and soft inside, drizzled with date syrup. Gone before they cool.',
    },
    servings: 6,
    prepMin: 60,
    cookMin: 20,
    tags: ['sweet', 'guests', 'kids'],
    ingredients: [
      { id: 'flour', qty: 2, unit: 'cup', role: 'core' },
      { id: 'yeast', qty: 1, unit: 'tbsp', role: 'core' },
      { id: 'sugar', qty: 1, unit: 'tbsp', role: 'support' },
      { id: 'date_syrup', qty: 0.5, unit: 'cup', role: 'support', subs: [{ id: 'honey', note: { ar: 'عسل بنفس الكمية', en: 'The same amount of honey' } }] },
      { id: 'yogurt', qty: 2, unit: 'tbsp', role: 'optional' },
      { id: 'cardamom', qty: 0.5, unit: 'tsp', role: 'optional', note: { ar: 'مطحون', en: 'ground' } },
      { id: 'saffron', unit: 'pinch', qty: 1, role: 'optional' },
      { id: 'oil', qty: 3, unit: 'cup', role: 'basic', note: { ar: 'للقلي', en: 'for frying' } },
      { id: 'water', unit: 'taste', role: 'basic' },
      { id: 'salt', unit: 'pinch', qty: 1, role: 'basic' },
    ],
    steps: [
      { title: { ar: 'جهّز الخليط', en: 'Make the batter' }, body: { ar: 'اخلط الطحين والخميرة والسكر والهيل والزعفران والزبادي مع كوب ونص ماء فاتر، واخفق حتى يصير الخليط ناعم ومطاطي.', en: 'Mix the flour, yeast, sugar, cardamom, saffron and yogurt with 1½ cups of warm water. Beat until smooth and stretchy.' }, minutes: 3 },
      { title: { ar: 'خلّه يخمر', en: 'Let it rise' }, body: { ar: 'غطّ الوعاء واتركه في مكان دافي حتى يتضاعف حجمه وتطلع فيه فقاعات.', en: 'Cover and leave somewhere warm until doubled and bubbly.' }, minutes: 45 },
      { title: { ar: 'سخّن الزيت', en: 'Heat the oil' }, body: { ar: 'سخّن الزيت على نار متوسطة. يكون جاهز إذا نقطت فيه نقطة عجين وطلعت لفوق على طول.', en: 'Heat the oil over medium heat. It’s ready when a drop of batter rises straight back up.' }, minutes: 5 },
      { title: { ar: 'اقلِ اللقيمات', en: 'Fry the luqaimat' }, body: { ar: 'اعصر العجين من يدك كرات صغيرة وخذها بملعقة مبلولة. اقلِها على دفعات وقلّبها حتى تصير ذهبية من كل الجهات.', en: 'Squeeze small balls of batter through your fist and scoop them with a wet spoon. Fry in batches, turning, until golden all over.' }, minutes: 12 },
      { title: { ar: 'صبّ الدبس وقدّم', en: 'Drizzle and serve' }, body: { ar: 'صفّها على ورق، ثم صبّ عليها دبس التمر وقدّمها وهي حارة.', en: 'Drain on paper, then drizzle with date syrup and serve warm.' } },
    ],
  },
  {
    id: 'masoob',
    art: 'masoob',
    title: { ar: 'معصوب', en: 'Masoob' },
    region: { ar: 'الحجاز والجنوب · فطور', en: 'Hijaz & the south · breakfast' },
    intro: {
      ar: 'خبز بر مفتّت يُهرس مع الموز والسمن، وفوقه عسل وقشطة. فطور سريع يخلّص الموز اللي استوى زيادة.',
      en: 'Torn wholewheat bread mashed with banana and ghee, topped with honey and cream. A quick breakfast that rescues overripe bananas.',
    },
    servings: 2,
    prepMin: 5,
    cookMin: 5,
    tags: ['quick', 'breakfast', 'kids', 'sweet'],
    ingredients: [
      { id: 'bread', qty: 3, unit: 'loaf', role: 'core', subs: [{ id: 'flour', note: { ar: 'سوّ خبزة رقيقة سريعة من طحين وماء على الصاج', en: 'Make a quick thin flatbread from flour and water on a hot pan' } }] },
      { id: 'banana', qty: 3, unit: 'piece', role: 'core', note: { ar: 'مستوية زيادة', en: 'very ripe' } },
      { id: 'ghee', qty: 2, unit: 'tbsp', role: 'support', subs: [{ id: 'butter', note: { ar: 'زبدة', en: 'Butter' } }] },
      { id: 'honey', qty: 3, unit: 'tbsp', role: 'support', subs: [{ id: 'date_syrup', note: { ar: 'دبس تمر', en: 'Date syrup' } }] },
      { id: 'cream', qty: 3, unit: 'tbsp', role: 'optional' },
      { id: 'cheese', unit: 'taste', role: 'optional', note: { ar: 'جبن مبشور، اختياري', en: 'grated, optional' } },
      { id: 'dates', qty: 4, unit: 'piece', role: 'optional' },
    ],
    steps: [
      { title: { ar: 'سخّن الخبز', en: 'Warm the bread' }, body: { ar: 'سخّن الخبز على الصاج أو في المقلاة، ثم قطّعه قطع صغيرة.', en: 'Warm the bread on a hot pan, then tear it into small pieces.' }, minutes: 3 },
      { title: { ar: 'اهرس', en: 'Mash' }, body: { ar: 'اهرس الخبز مع الموز والسمن بيدك أو بالملعقة حتى يتماسك.', en: 'Mash the bread with the bananas and ghee, by hand or with a spoon, until it holds together.' } },
      { title: { ar: 'زيّن وقدّم', en: 'Top and serve' }, body: { ar: 'افرده في صحن، وحط فوقه القشطة والعسل والتمر المقطع.', en: 'Spread it on a plate and top with the cream, honey and chopped dates.' } },
    ],
  },
  {
    id: 'balaleet',
    art: 'balaleet',
    title: { ar: 'بلاليط', en: 'Balaleet' },
    region: { ar: 'الخليج · فطور العيد', en: 'Gulf · the Eid breakfast' },
    intro: {
      ar: 'شعيرية حلوة بالهيل والزعفران، وفوقها عجة بيض مالحة. حلو ومالح في لقمة وحدة.',
      en: 'Sweet vermicelli with cardamom and saffron under a savoury omelette. Sweet and salty in one bite.',
    },
    servings: 3,
    prepMin: 5,
    cookMin: 18,
    tags: ['quick', 'breakfast', 'kids', 'sweet'],
    ingredients: [
      { id: 'vermicelli', qty: 2, unit: 'cup', role: 'core' },
      { id: 'eggs', qty: 3, unit: 'piece', role: 'core' },
      { id: 'sugar', qty: 0.33, unit: 'cup', role: 'support', subs: [{ id: 'honey', note: { ar: 'ربع كوب عسل', en: 'A quarter cup of honey' } }] },
      { id: 'butter', qty: 2, unit: 'tbsp', role: 'support', subs: [{ id: 'ghee', note: { ar: 'سمن', en: 'Ghee' } }] },
      { id: 'cardamom', qty: 0.5, unit: 'tsp', role: 'optional' },
      { id: 'saffron', qty: 1, unit: 'pinch', role: 'optional' },
      { id: 'water', unit: 'taste', role: 'basic' },
      { id: 'salt', unit: 'pinch', qty: 1, role: 'basic' },
    ],
    steps: [
      { title: { ar: 'حمّص الشعيرية', en: 'Toast the vermicelli' }, body: { ar: 'قلّب الشعيرية في الزبدة حتى يصير لونها ذهبي خفيف.', en: 'Stir the vermicelli in the butter until lightly golden.' }, minutes: 3 },
      { title: { ar: 'اطبخها بالسكر والزعفران', en: 'Cook with sugar and saffron' }, body: { ar: 'أضف كوبين ماء والسكر والهيل والزعفران، وغطّها على نار هادئة حتى تتشرّب الماء.', en: 'Add 2 cups of water with the sugar, cardamom and saffron. Cover and cook gently until the water is absorbed.' }, minutes: 8 },
      { title: { ar: 'سوّ العجة', en: 'Make the omelette' }, body: { ar: 'اخفق البيض مع رشة ملح، واطبخه في مقلاة مدهونة كعجة رقيقة.', en: 'Beat the eggs with a pinch of salt and cook into a thin omelette in a greased pan.' }, minutes: 3 },
      { title: { ar: 'قدّم', en: 'Serve' }, body: { ar: 'غرّف الشعيرية في صحن، وحط العجة فوقها.', en: 'Spoon the vermicelli onto a plate and lay the omelette on top.' } },
    ],
  },
  {
    id: 'salona',
    art: 'salona',
    title: { ar: 'صالونة دجاج', en: 'Chicken Salona' },
    region: { ar: 'الخليج · غداء الأيام العادية', en: 'Gulf · an everyday lunch' },
    intro: {
      ar: 'مرق دجاج وخضار باللومي والبزار، خفيف ودافي. يخلّص لك الخضار اللي في الثلاجة.',
      en: 'A chicken and vegetable stew with loomi and spices, light and warming. Good for using up the vegetables in the fridge.',
    },
    servings: 4,
    prepMin: 15,
    cookMin: 50,
    tags: ['family', 'light', 'comfort'],
    ingredients: [
      { id: 'chicken', qty: 800, unit: 'g', role: 'core', subs: [{ id: 'meat', note: { ar: 'لحم، والسلق ساعة', en: 'Meat, simmered for an hour' } }] },
      { id: 'potato', qty: 2, unit: 'piece', role: 'support' },
      { id: 'carrot', qty: 2, unit: 'piece', role: 'support' },
      { id: 'zucchini', qty: 2, unit: 'piece', role: 'support', subs: [{ id: 'bell_pepper', note: { ar: 'فلفل رومي بداله', en: 'Bell pepper instead' } }] },
      { id: 'tomato', qty: 3, unit: 'piece', role: 'support' },
      { id: 'onion', qty: 1, unit: 'piece', role: 'support' },
      { id: 'garlic', qty: 3, unit: 'clove', role: 'optional' },
      { id: 'tomato_paste', qty: 1, unit: 'tbsp', role: 'optional' },
      { id: 'loomi', qty: 1, unit: 'piece', role: 'optional', subs: [{ id: 'lemon', note: { ar: 'عصرة ليمون آخر الطبخ', en: 'A squeeze of lemon at the end' } }] },
      { id: 'kabsa_spice', qty: 1, unit: 'tbsp', role: 'optional' },
      { id: 'turmeric', qty: 1, unit: 'tsp', role: 'optional' },
      { id: 'coriander', unit: 'taste', role: 'optional' },
      { id: 'green_chili', qty: 1, unit: 'piece', role: 'optional' },
      ...basics,
    ],
    steps: [
      { title: { ar: 'حمّر البصل', en: 'Brown the onion' }, body: { ar: 'قلّب البصل المقطع في الزيت حتى يصير ذهبي، ثم أضف الثوم.', en: 'Cook the chopped onion in the oil until golden, then add the garlic.' }, minutes: 6 },
      { title: { ar: 'أضف الدجاج والبهارات', en: 'Add chicken and spices' }, body: { ar: 'أضف الدجاج والبزار والكركم، وقلّب حتى يتغير لون الدجاج.', en: 'Add the chicken, spice mix and turmeric and stir until the chicken changes colour.' }, minutes: 6 },
      { title: { ar: 'أضف الطماطم', en: 'Add the tomatoes' }, body: { ar: 'أضف الطماطم المبشورة والمعجون، وخلّها تتسبك.', en: 'Add the grated tomatoes and paste and let them cook down.' }, minutes: 5 },
      { title: { ar: 'اسلق باللومي', en: 'Simmer with loomi' }, body: { ar: 'أضف ٤ أكواب ماء واللومي المثقوب والفلفل الحار، وغطّ القدر على نار هادئة.', en: 'Add 4 cups of water, the pierced loomi and the chili. Cover and simmer gently.' }, minutes: 20 },
      { title: { ar: 'أضف الخضار', en: 'Add the vegetables' }, body: { ar: 'أضف البطاطس والجزر أول، وبعد ٥ دقايق أضف الكوسا.', en: 'Add the potatoes and carrots first, then the zucchini after 5 minutes.' }, minutes: 15 },
      { title: { ar: 'زيّن وقدّم', en: 'Garnish and serve' }, body: { ar: 'رشّ الكزبرة، وقدّمها مع رز أبيض أو خبز.', en: 'Scatter over the coriander and serve with white rice or bread.' } },
    ],
  },
]

export const RECIPE_MAP: Record<string, Recipe> = Object.fromEntries(RECIPES.map((r) => [r.id, r]))

export const totalMinutes = (r: Recipe) => r.prepMin + r.cookMin
