import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  Clock,
  Smile,
  Hand,
  Leaf,
  Coffee,
  Trophy,
  Plane,
  Lightbulb,
  Heart,
  Flag,
  Trash2
} from 'lucide-react';

// Comprehensive Unicode Emoji Categories with descriptive tags for instant search
const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys & Emotion',
    icon: Smile,
    emojis: [
      { char: '😀', name: 'grinning face happy smile' },
      { char: '😃', name: 'grinning face big eyes happy' },
      { char: '😄', name: 'grinning face smiling eyes happy' },
      { char: '😁', name: 'beaming face smiling eyes grin' },
      { char: '😆', name: 'grinning squinting face laugh' },
      { char: '😅', name: 'grinning face sweat relief' },
      { char: '🤣', name: 'rolling on floor laughing rofl lol' },
      { char: '😂', name: 'face with tears of joy cry laugh lol' },
      { char: '🙂', name: 'slightly smiling face' },
      { char: '🙃', name: 'upside-down face sarcastic' },
      { char: '😉', name: 'winking face wink flirty' },
      { char: '😊', name: 'smiling face smiling eyes blush' },
      { char: '😇', name: 'smiling face with halo angel innocent' },
      { char: '🥰', name: 'smiling face with hearts love adore' },
      { char: '😍', name: 'smiling face heart-eyes love in love' },
      { char: '🤩', name: 'star-struck excited amazing wow' },
      { char: '😘', name: 'face blowing kiss love kiss' },
      { char: '😗', name: 'kissing face' },
      { char: '😚', name: 'kissing face closed eyes' },
      { char: '😙', name: 'kissing face smiling eyes' },
      { char: '😋', name: 'face savoring food delicious yum' },
      { char: '😛', name: 'face with tongue' },
      { char: '😜', name: 'winking face with tongue playful' },
      { char: '🤪', name: 'zany face goofy crazy wild' },
      { char: '😝', name: 'squinting face with tongue' },
      { char: '🤑', name: 'money-mouth face rich cash profit' },
      { char: '🤗', name: 'hugging face hug support' },
      { char: '🤭', name: 'face with hand over mouth oops teehee' },
      { char: '🤫', name: 'shushing face quiet secret hush' },
      { char: '🤔', name: 'thinking face hmm wonder puzzle' },
      { char: '🤐', name: 'zipper-mouth face secret silence' },
      { char: '🤨', name: 'face with raised eyebrow suspicious' },
      { char: '😐', name: 'neutral face straight' },
      { char: '😑', name: 'expressionless face blank' },
      { char: '😶', name: 'face without mouth mute' },
      { char: '😏', name: 'smirking face smug flirt' },
      { char: '😒', name: 'unamused face meh unimpressed' },
      { char: '🙄', name: 'face with rolling eyes eye roll whatever' },
      { char: '😬', name: 'grimacing face awkward yikes' },
      { char: '🤥', name: 'lying face pinocchio liar' },
      { char: '😌', name: 'relieved face calm peaceful' },
      { char: '😔', name: 'pensive face sad dejected' },
      { char: '😪', name: 'sleepy face tired' },
      { char: '🤤', name: 'drooling face hungry craving' },
      { char: '😴', name: 'sleeping face zzz snore' },
      { char: '😷', name: 'face with medical mask sick protected' },
      { char: '🤒', name: 'face with thermometer sick fever' },
      { char: '🤕', name: 'face with head-bandage hurt injured' },
      { char: '🤢', name: 'nauseated face gross sick' },
      { char: '🤮', name: 'face vomiting barf puking' },
      { char: '🤧', name: 'sneezing face cold tissue' },
      { char: '🥵', name: 'hot face sweating spicy summer' },
      { char: '🥶', name: 'cold face freezing winter ice' },
      { char: '🥴', name: 'woozy face dizzy drunk tip' },
      { char: '😵', name: 'dizzy face shocked knocked out' },
      { char: '🤯', name: 'exploding head mind blown shock wow' },
      { char: '🤠', name: 'cowboy hat face western howdy' },
      { char: '🥳', name: 'partying face celebrate celebrate happy party' },
      { char: '😎', name: 'smiling face with sunglasses cool awesome' },
      { char: '🤓', name: 'nerd face geek smart tech' },
      { char: '🧐', name: 'face with monocle classy inspect' },
      { char: '😕', name: 'confused face unsure' },
      { char: '😟', name: 'worried face anxious' },
      { char: '🙁', name: 'slightly frowning face sad' },
      { char: '😮', name: 'face with open mouth surprised' },
      { char: '😯', name: 'hushed face surprised wow' },
      { char: '😲', name: 'astonished face stunned shocked' },
      { char: '😳', name: 'flushed face embarrassed shocked' },
      { char: '🥺', name: 'pleading face please begging cute' },
      { char: '😦', name: 'frowning face with open mouth' },
      { char: '😧', name: 'anguished face stressed' },
      { char: '😨', name: 'fearful face scared' },
      { char: '😰', name: 'anxious face with sweat nervous' },
      { char: '😥', name: 'sad but relieved face phew' },
      { char: '😢', name: 'crying face tear sad' },
      { char: '😭', name: 'loudly crying face bawling sob sad' },
      { char: '😱', name: 'face screaming in fear scared scream' },
      { char: '😖', name: 'confounded face upset' },
      { char: '😣', name: 'persevering face struggling' },
      { char: '😞', name: 'disappointed face sad' },
      { char: '😓', name: 'downcast face with sweat stressed' },
      { char: '😩', name: 'weary face exhausted tired' },
      { char: '😫', name: 'tired face frustrated' },
      { char: '🥱', name: 'yawning face bored sleepy' },
      { char: '😤', name: 'face with steam from nose proud angry victory' },
      { char: '😡', name: 'enraged face pouting mad angry' },
      { char: '😠', name: 'angry face mad furious' },
      { char: '🤬', name: 'face with symbols on mouth swearing cursing' },
      { char: '😈', name: 'smiling face with horns devil naughty' },
      { char: '👿', name: 'angry face with horns evil devil' },
      { char: '💀', name: 'skull dead dying laughing' },
      { char: '☠️', name: 'skull and crossbones danger toxic' },
      { char: '💩', name: 'pile of poo poop funny' },
      { char: '🤡', name: 'clown face silly joker' },
      { char: '👹', name: 'ogre monster japanese' },
      { char: '👺', name: 'goblin monster' },
      { char: '👻', name: 'ghost spooky boo halloween' },
      { char: '👽', name: 'alien extraterrestrial ufo sci-fi' },
      { char: '👾', name: 'alien monster retro pixel arcade 8-bit' },
      { char: '🤖', name: 'robot face tech ai bot automation' },
      { char: '😺', name: 'grinning cat happy kitten' },
      { char: '😸', name: 'grinning cat with smiling eyes' },
      { char: '😹', name: 'cat with tears of joy laughing' },
      { char: '😻', name: 'smiling cat with heart-eyes love' },
      { char: '😼', name: 'cat with wry smile smirk' },
      { char: '😽', name: 'kissing cat' },
      { char: '🙀', name: 'weary cat shocked scared' },
      { char: '😿', name: 'crying cat sad tear' },
      { char: '😾', name: 'pouting cat mad angry' },
      { char: '🙈', name: 'see-no-evil monkey shy hide' },
      { char: '🙉', name: 'hear-no-evil monkey' },
      { char: '🙊', name: 'speak-no-evil monkey secret' }
    ]
  },
  {
    id: 'people',
    name: 'People & Gestures',
    icon: Hand,
    emojis: [
      { char: '👋', name: 'waving hand hello wave hi bye' },
      { char: '🤚', name: 'raised back of hand' },
      { char: '🖐️', name: 'hand with fingers splayed stop five' },
      { char: '✋', name: 'raised hand stop high five' },
      { char: '🖖', name: 'vulcan salute spock live long prosper' },
      { char: '👌', name: 'ok hand okay perfect agree' },
      { char: '🤌', name: 'pinched fingers italian chef kiss' },
      { char: '🤏', name: 'pinching hand tiny small little bit' },
      { char: '✌️', name: 'victory hand peace sign two' },
      { char: '🤞', name: 'crossed fingers good luck hope' },
      { char: '🤟', name: 'love-you gesture ily rock' },
      { char: '🤘', name: 'sign of the horns rock metal cool' },
      { char: '🤙', name: 'call me hand shaka hang loose' },
      { char: '👈', name: 'backhand index pointing left point' },
      { char: '👉', name: 'backhand index pointing right point here' },
      { char: '👆', name: 'backhand index pointing up' },
      { char: '🖕', name: 'middle finger rude' },
      { char: '👇', name: 'backhand index pointing down below read more' },
      { char: '☝️', name: 'index pointing up attention one' },
      { char: '👍', name: 'thumbs up like approve good yes great' },
      { char: '👎', name: 'thumbs down dislike bad no disagree' },
      { char: '✊', name: 'raised fist solidarity power' },
      { char: '👊', name: 'oncoming fist bump bro fist' },
      { char: '🤛', name: 'left-facing fist' },
      { char: '🤜', name: 'right-facing fist' },
      { char: '👏', name: 'clapping hands applause bravo congrats' },
      { char: '🙌', name: 'raising hands celebration praise hooray' },
      { char: '👐', name: 'open hands welcome' },
      { char: '🤲', name: 'palms up together prayer offering' },
      { char: '🤝', name: 'handshake deal agreement partnership partner' },
      { char: '🙏', name: 'folded hands pray please thank you namaste gratitude' },
      { char: '✍️', name: 'writing hand write notes copy create' },
      { char: '💅', name: 'nail polish sassy elegant chill' },
      { char: '🤳', name: 'selfie camera photo creator' },
      { char: '💪', name: 'flexed biceps strong muscle power fitness' },
      { char: '🦾', name: 'mechanical arm robotic bionic cyborg' },
      { char: '🦿', name: 'mechanical leg prosthetic' },
      { char: '🦵', name: 'leg kick walk' },
      { char: '🦶', name: 'foot step' },
      { char: '👂', name: 'ear listen hear podcast audio' },
      { char: '👃', name: 'nose smell sniff' },
      { char: '🧠', name: 'brain smart intellect mind psychology' },
      { char: '🫀', name: 'anatomical heart cardio organ' },
      { char: '🫁', name: 'lungs breath breathing health' },
      { char: '🦷', name: 'tooth dental smile white' },
      { char: '🦴', name: 'bone dog anatomy' },
      { char: '👀', name: 'eyes look see gaze peek view watch' },
      { char: '👁️', name: 'eye vision look look' },
      { char: '👅', name: 'tongue taste lick silly' },
      { char: '👄', name: 'mouth lips kiss talk' },
      { char: '👶', name: 'baby infant child kid' },
      { char: '🧒', name: 'child kid youth' },
      { char: '👦', name: 'boy young male' },
      { char: '👧', name: 'girl young female' },
      { char: '🧑', name: 'person human someone' },
      { char: '👱', name: 'person blond hair' },
      { char: '👨', name: 'man adult male' },
      { char: '🧔', name: 'person beard bearded man' },
      { char: '👩', name: 'woman adult female lady' },
      { char: '🧓', name: 'older person elder' },
      { char: '👴', name: 'old man grandfather senior' },
      { char: '👵', name: 'old woman grandmother grandma' },
      { char: '🧑‍💻', name: 'technologist coder developer hacker programmer tech' },
      { char: '👩‍💻', name: 'woman technologist coder software engineer' },
      { char: '👨‍💻', name: 'man technologist developer builder' },
      { char: '🧑‍💼', name: 'office worker professional business executive' },
      { char: '👩‍💼', name: 'woman office worker business manager' },
      { char: '👨‍💼', name: 'man office worker corporate suit' },
      { char: '🧑‍🎨', name: 'artist creator designer painter' },
      { char: '👩‍🎨', name: 'woman artist creative' },
      { char: '👨‍🎨', name: 'man artist painter' },
      { char: '🧑‍🚀', name: 'astronaut space nasa cosmonaut' },
      { char: '🦸', name: 'superhero hero power save' },
      { char: '🦹', name: 'supervillain villain evil' },
      { char: '🧙', name: 'mage wizard magic spell' },
      { char: '🧚', name: 'fairy magic tinker' },
      { char: '🧛', name: 'vampire dracula halloween' },
      { char: '🧜', name: 'merperson mermaid sea ocean' },
      { char: '🧝', name: 'elf fantasy lord' },
      { char: '🧞', name: 'genie magic wish lamp' },
      { char: '🧟', name: 'zombie undead apocalypse walking' }
    ]
  },
  {
    id: 'animals',
    name: 'Animals & Nature',
    icon: Leaf,
    emojis: [
      { char: '🐶', name: 'dog face puppy pet canine' },
      { char: '🐱', name: 'cat face kitten pet feline' },
      { char: '🐭', name: 'mouse face rodent' },
      { char: '🐹', name: 'hamster face pet rodent' },
      { char: '🐰', name: 'rabbit face bunny easter' },
      { char: '🦊', name: 'fox face cunning orange' },
      { char: '🐻', name: 'bear face grizzly teddy' },
      { char: '🐼', name: 'panda face bamboo china' },
      { char: '🐻‍❄️', name: 'polar bear arctic ice' },
      { char: '🐨', name: 'koala australia eucalyptus' },
      { char: '🐯', name: 'tiger face wild jungle cat' },
      { char: '🦁', name: 'lion face king pride predator' },
      { char: '🐮', name: 'cow face farm dairy beef' },
      { char: '🐷', name: 'pig face farm oink' },
      { char: '🐽', name: 'pig nose snout' },
      { char: '🐸', name: 'frog face amphibian toad' },
      { char: '🐵', name: 'monkey face chimp banana' },
      { char: '🐔', name: 'chicken hen poultry farm' },
      { char: '🐧', name: 'penguin arctic bird cold' },
      { char: '🐦', name: 'bird tweet avian flying' },
      { char: '🐤', name: 'baby chick newborn yellow' },
      { char: '🐣', name: 'hatching chick egg birth new' },
      { char: '🐥', name: 'front-facing baby chick' },
      { char: '🦆', name: 'duck mallard pond quack' },
      { char: '🦅', name: 'eagle raptor bald usa freedom' },
      { char: '🦉', name: 'owl wise night nocturnal' },
      { char: '🦇', name: 'bat vampire nocturnal cave' },
      { char: '🐺', name: 'wolf pack howling wild' },
      { char: '🐗', name: 'boar wild pig tusk' },
      { char: '🐴', name: 'horse face pony steed' },
      { char: '🦄', name: 'unicorn magic fantasy startup rare' },
      { char: '🐝', name: 'honeybee bee insect honey buzz' },
      { char: '🪱', name: 'worm bait garden dirt' },
      { char: '🐛', name: 'bug caterpillar insect larva code error' },
      { char: '🦋', name: 'butterfly insect transform beauty' },
      { char: '🐌', name: 'snail slow shell garden' },
      { char: '🐞', name: 'lady beetle ladybug insect lucky' },
      { char: '🐜', name: 'ant insect colony worker' },
      { char: '🪰', name: 'fly insect buzzing pest' },
      { char: '🪲', name: 'beetle bug insect' },
      { char: '🪳', name: 'cockroach bug pest roach' },
      { char: '🦟', name: 'mosquito insect bite bug' },
      { char: '🦗', name: 'cricket insect grasshopper' },
      { char: '🕷️', name: 'spider arachnid web bug' },
      { char: '🕸️', name: 'spider web network trap' },
      { char: '🦂', name: 'scorpion sting desert venom' },
      { char: '🐢', name: 'turtle slow shell reptile' },
      { char: '🐍', name: 'snake python serpent reptile cobra' },
      { char: '🦎', name: 'lizard gecko reptile green' },
      { char: '🦖', name: 't-rex dinosaur rex extinct' },
      { char: '🦕', name: 'sauropod dinosaur brontosaurus herbivore' },
      { char: '🐙', name: 'octopus sea tentacles ocean kraken' },
      { char: '🦑', name: 'squid ocean calamari sea' },
      { char: '🦐', name: 'shrimp seafood prawn ocean' },
      { char: '🦞', name: 'lobster seafood claws ocean' },
      { char: '🦀', name: 'crab seafood claws crustacean' },
      { char: '🐡', name: 'blowfish puffer ocean poison' },
      { char: '🐠', name: 'tropical fish aquarium nemo' },
      { char: '🐟', name: 'fish sea ocean salmon seafood' },
      { char: '🐬', name: 'dolphin ocean mammal sea smart' },
      { char: '🐳', name: 'spouting whale ocean mammal sea giant' },
      { char: '🐋', name: 'whale ocean sea blue' },
      { char: '🦈', name: 'shark ocean predator jaws teeth' },
      { char: '🦭', name: 'seal ocean arctic mammal' },
      { char: '🐊', name: 'crocodile alligator swamp reptile' },
      { char: '🌲', name: 'evergreen tree pine forest nature' },
      { char: '🌳', name: 'deciduous tree forest wood green' },
      { char: '🌴', name: 'palm tree tropical beach summer island' },
      { char: '🌵', name: 'cactus desert plant succulent spike' },
      { char: '🌾', name: 'sheaf of rice grain harvest agriculture' },
      { char: '🌿', name: 'herb plant leaf nature organic natural' },
      { char: '☘️', name: 'shamrock clover ireland lucky' },
      { char: '🍀', name: 'four leaf clover luck fortune' },
      { char: '🍁', name: 'maple leaf autumn fall canada' },
      { char: '🍂', name: 'fallen leaf autumn season dry' },
      { char: '🍃', name: 'leaf fluttering in wind breeze fresh' },
      { char: '🌸', name: 'cherry blossom flower sakura spring pink' },
      { char: '💮', name: 'white flower rosette badge' },
      { char: '🌹', name: 'rose red flower romance love valentine' },
      { char: '🌺', name: 'hibiscus flower tropical hawaii' },
      { char: '🌻', name: 'sunflower yellow sunny summer flora' },
      { char: '🌼', name: 'blossom yellow flower bloom' },
      { char: '🌷', name: 'tulip flower spring flora' },
      { char: '🌱', name: 'seedling sprout new start growth plant' },
      { char: '🪴', name: 'potted plant houseplant indoor green' },
      { char: '🌞', name: 'sun with face sunny bright warm' },
      { char: '⭐', name: 'star shining rating favorite stellar' },
      { char: '🌟', name: 'glowing star bright shining sparkle' },
      { char: '✨', name: 'sparkles stars sparkle magic shine new ai' },
      { char: '⚡', name: 'high voltage lightning bolt power energy electric fast' },
      { char: '🔥', name: 'fire flame hot lit viral trend trending popular' }
    ]
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      { char: '🍏', name: 'green apple fruit healthy fresh' },
      { char: '🍎', name: 'red apple fruit mac teacher' },
      { char: '🍐', name: 'pear fruit juicy sweet' },
      { char: '🍊', name: 'tangerine orange citrus fruit' },
      { char: '🍋', name: 'lemon citrus sour yellow' },
      { char: '🍌', name: 'banana fruit potassium monkey' },
      { char: '🍉', name: 'watermelon fruit summer melon sweet' },
      { char: '🍇', name: 'grapes fruit wine purple vine' },
      { char: '🍓', name: 'strawberry berry fruit red sweet' },
      { char: '🫐', name: 'blueberries berry fruit superfood' },
      { char: '🍈', name: 'melon cantaloupe honeydew' },
      { char: '🍒', name: 'cherries fruit cherry twin sweet' },
      { char: '🍑', name: 'peach fruit sweet butt' },
      { char: '🥭', name: 'mango fruit tropical sweet' },
      { char: '🍍', name: 'pineapple tropical fruit sweet' },
      { char: '🥥', name: 'coconut tropical palm nut milk' },
      { char: '🥝', name: 'kiwi fruit fuzzy green' },
      { char: '🍅', name: 'tomato vegetable fruit red salad' },
      { char: '🥑', name: 'avocado vegetable guacamole keto healthy' },
      { char: '🥦', name: 'broccoli vegetable green healthy nutrition' },
      { char: '🥬', name: 'leafy green lettuce salad cabbage' },
      { char: '🥒', name: 'cucumber vegetable pickle fresh' },
      { char: '🌶️', name: 'hot pepper chili spicy hot jalapeño' },
      { char: '🫑', name: 'bell pepper capsicum sweet green' },
      { char: '🌽', name: 'ear of corn maize popcorn cob' },
      { char: '🥕', name: 'carrot vegetable orange vitamin rabbit' },
      { char: '🧄', name: 'garlic food spice flavor vampire' },
      { char: '🧅', name: 'onion food vegetable crying flavor' },
      { char: '🥔', name: 'potato spud carb french fry' },
      { char: '🥐', name: 'croissant pastry french butter bakery' },
      { char: '🍞', name: 'bread loaf bakery carb dough' },
      { char: '🥖', name: 'baguette bread french bakery crusty' },
      { char: '🥨', name: 'pretzel snack salt knot' },
      { char: '🥯', name: 'bagel bread bakery breakfast cream cheese' },
      { char: '🥞', name: 'pancakes breakfast syrup stack butter' },
      { char: '🧇', name: 'waffle breakfast syrup grid' },
      { char: '🧀', name: 'cheese wedge dairy swiss cheddar mouse' },
      { char: '🍖', name: 'meat on bone roast protein dinner' },
      { char: '🍗', name: 'poultry leg chicken drumstick turkey fried' },
      { char: '🥩', name: 'cut of meat steak beef raw butcher' },
      { char: '🥓', name: 'bacon pork breakfast crispy sizzle' },
      { char: '🍔', name: 'hamburger burger fast food beef diner' },
      { char: '🍟', name: 'french fries potato fast food salty snack' },
      { char: '🍕', name: 'pizza slice italian cheese pepperoni food' },
      { char: '🌭', name: 'hot dog sausage bun frankfurter fast food' },
      { char: '🥪', name: 'sandwich lunch sub BLT bread' },
      { char: '🌮', name: 'taco mexican street food shell' },
      { char: '🌯', name: 'burrito mexican wrap tortilla wrap' },
      { char: '🍳', name: 'cooking egg breakfast fry pan' },
      { char: '🍲', name: 'pot of food stew soup hot bowl' },
      { char: '🥣', name: 'bowl with spoon cereal oatmeal soup' },
      { char: '🥗', name: 'green salad healthy diet vegetables' },
      { char: '🍿', name: 'popcorn movie snack cinema buttery' },
      { char: '🧈', name: 'butter dairy cook spread yellow' },
      { char: '🧂', name: 'salt condiment seasoning white flavor' },
      { char: '🍱', name: 'bento box japanese lunch meal' },
      { char: '🍣', name: 'sushi japanese raw fish rice roll' },
      { char: '🥟', name: 'dumpling dim sum gyoza potsticker' },
      { char: '🍜', name: 'steaming bowl ramen noodles soup noodle' },
      { char: '🍝', name: 'spaghetti pasta italian noodle tomato' },
      { char: '🍦', name: 'soft ice cream dessert dairy swirl cone' },
      { char: '🍧', name: 'shaved ice dessert sweet cold syrup' },
      { char: '🍨', name: 'ice cream dessert scoop bowl sweet' },
      { char: '🍩', name: 'doughnut donut dessert sweet glaze bakery' },
      { char: '🍪', name: 'cookie chocolate chip sweet biscuit bake' },
      { char: '🎂', name: 'birthday cake dessert celebration sweet party' },
      { char: '🍰', name: 'shortcake cake slice dessert sweet' },
      { char: '🧁', name: 'cupcake dessert sweet muffin bakery' },
      { char: '🥧', name: 'pie bakery dessert pastry crust' },
      { char: '🍫', name: 'chocolate bar sweet candy cocoa treat' },
      { char: '🍬', name: 'candy sweet sugar treat wrapper' },
      { char: '🍭', name: 'lollipop sweet candy sugar stick' },
      { char: '🍮', name: 'custard flan pudding dessert sweet' },
      { char: '🍯', name: 'honey pot sweet bee nectar bear' },
      { char: '🍼', name: 'baby bottle milk infant feed' },
      { char: '🥛', name: 'glass of milk dairy drink calcium beverage' },
      { char: '☕', name: 'hot beverage coffee tea espresso cafe morning' },
      { char: '🫖', name: 'teapot brew tea cup ceramic' },
      { char: '🍵', name: 'teacup without handle green tea matcha' },
      { char: '🍶', name: 'sake japanese rice wine bottle cup' },
      { char: '🍾', name: 'bottle with popping cork champagne celebration win cheers' },
      { char: '🍷', name: 'wine glass red wine alcohol drink vineyard' },
      { char: '🍸', name: 'cocktail glass martini alcohol drink olive' },
      { char: '🍹', name: 'tropical drink cocktail summer beach fruity' },
      { char: '🍺', name: 'beer mug alcohol pub drink lager' },
      { char: '🍻', name: 'clinking beer mugs cheers party pub toast' },
      { char: '🥂', name: 'clinking glasses champagne toast cheers celebration' },
      { char: '🥃', name: 'tumbler glass whiskey scotch bourbon on rocks' },
      { char: '🥤', name: 'cup with straw soda drink soft drink beverage' },
      { char: '🧋', name: 'bubble tea boba tapioca milk tea drink' },
      { char: '🧃', name: 'beverage box juice box straw fruit carton' }
    ]
  },
  {
    id: 'activities',
    name: 'Activities & Sports',
    icon: Trophy,
    emojis: [
      { char: '⚽', name: 'soccer ball football sport fifa game goal' },
      { char: '🏀', name: 'basketball sport nba hoop ball dribble' },
      { char: '🏈', name: 'american football sport nfl touchdown super bowl' },
      { char: '⚾', name: 'baseball sport mlb pitch bat' },
      { char: '🥎', name: 'softball sport ball underhand' },
      { char: '🎾', name: 'tennis ball sport racket match set' },
      { char: '🏐', name: 'volleyball sport beach spike net' },
      { char: '🏉', name: 'rugby football sport scrum tackle' },
      { char: '🥏', name: 'flying disc frisbee ultimate disc catch' },
      { char: '🎱', name: 'pool 8 ball billiards game cue eight' },
      { char: '🏓', name: 'ping pong table tennis paddle ball sport' },
      { char: '🏸', name: 'badminton racket shuttlecock birdie sport' },
      { char: '🏒', name: 'ice hockey puck stick nhl sport winter' },
      { char: '🏑', name: 'field hockey stick ball turf sport' },
      { char: '🏏', name: 'cricket game bat wicket ball ipl sport' },
      { char: '⛳', name: 'flag in hole golf sport green course putt' },
      { char: '🎯', name: 'bullseye dart target direct hit goal accurate aim' },
      { char: '🥊', name: 'boxing glove punch fighter combat sport' },
      { char: '🥋', name: 'martial arts uniform karate judo taekwondo' },
      { char: '🛹', name: 'skateboard skate deck trick ollie' },
      { char: '🛼', name: 'roller skate roller rink quad disco' },
      { char: '🎿', name: 'skis ski snow winter mountain slope' },
      { char: '🏂', name: 'snowboarder snowboard winter mountain slope' },
      { char: '🏋️', name: 'person lifting weights gym bodybuilding workout fitness' },
      { char: '🤼', name: 'people wrestling combat wwe match' },
      { char: '🤸', name: 'person cartwheeling gymnastics tumble agile' },
      { char: '⛹️', name: 'person bouncing ball basketball dribble athlete' },
      { char: '🤺', name: 'person fencing sword foil combat sport' },
      { char: '🧗', name: 'person climbing rock wall outdoor boulder' },
      { char: '🧘', name: 'person in lotus position yoga meditate zen calm' },
      { char: '🏄', name: 'person surfing wave beach ocean board surf' },
      { char: '🏊', name: 'person swimming pool lap swim ocean water' },
      { char: '🤽', name: 'person playing water polo pool water team' },
      { char: '🚣', name: 'person rowing boat lake crew paddle oars' },
      { char: '🚴', name: 'person biking bicycle cycle road bike athlete' },
      { char: '🚵', name: 'person mountain biking trail offroad mtb cycle' },
      { char: '🏆', name: 'trophy champion award winner 1st first prize victory' },
      { char: '🥇', name: '1st place medal gold winner first victory' },
      { char: '🥈', name: '2nd place medal silver second runner up' },
      { char: '🥉', name: '3rd place medal bronze third medal' },
      { char: '🏅', name: 'sports medal award honor recognition' },
      { char: '🎖️', name: 'military medal honor service brave' },
      { char: '🎗️', name: 'reminder ribbon awareness support cause' },
      { char: '🎫', name: 'ticket admission entrance pass concert show' },
      { char: '🎟️', name: 'admission tickets movie cinema raffle pass' },
      { char: '🎪', name: 'circus tent big top carnival carnival show' },
      { char: '🤹', name: 'person juggling circus skill multitasking' },
      { char: '🎭', name: 'performing arts drama theater comedy tragedy masks' },
      { char: '🎨', name: 'artist palette paint art design draw creative' },
      { char: '🎬', name: 'clapper board film movie cinema action direct video' },
      { char: '🎤', name: 'microphone mic audio sing karaoke speech talk podcast' },
      { char: '🎧', name: 'headphone audio music sound listen podcast listen' },
      { char: '🎼', name: 'musical score sheet music notes melody' },
      { char: '🎵', name: 'musical note sound melody tone song' },
      { char: '🎶', name: 'musical notes music sound melody song tune' },
      { char: '🎹', name: 'musical keyboard piano keys instrument classic' },
      { char: '🥁', name: 'drum percussion beat rhythm instrument' },
      { char: '🎷', name: 'saxophone jazz brass instrument music' },
      { char: '🎺', name: 'trumpet brass horn instrument fanfare' },
      { char: '🎸', name: 'guitar acoustic electric rock instrument strum' },
      { char: '🪕', name: 'banjo bluegrass folk instrument string' },
      { char: '🎻', name: 'violin fiddle classic orchestra instrument' },
      { char: '🎲', name: 'game die dice roll gamble board game chance' },
      { char: '♟️', name: 'chess pawn game strategy king queen board' },
      { char: '🎳', name: 'bowling ball pins strike spare alley sport' },
      { char: '🎮', name: 'video game controller playstation xbox console gamer' },
      { char: '🎰', name: 'slot machine casino jackpot lucky gamble 777' },
      { char: '🧩', name: 'puzzle piece jigsaw solve problem brain fit' }
    ]
  },
  {
    id: 'travel',
    name: 'Travel & Places',
    icon: Plane,
    emojis: [
      { char: '🚗', name: 'automobile car vehicle drive commute red' },
      { char: '🚕', name: 'taxi cab yellow ride car city' },
      { char: '🚙', name: 'sport utility vehicle suv car ride drive' },
      { char: '🚌', name: 'bus public transit transit commute commute' },
      { char: '🚎', name: 'trolleybus transit electric cable bus' },
      { char: '🏎️', name: 'racing car race f1 formula fast track' },
      { char: '🚓', name: 'police car law enforcement siren cops patrol' },
      { char: '🚑', name: 'ambulance emergency medical hospital paramedic' },
      { char: '🚒', name: 'fire engine truck emergency rescue fire siren' },
      { char: '🚐', name: 'minibus van transit camper travel' },
      { char: '🛻', name: 'pickup truck haul cargo truck utility' },
      { char: '🚚', name: 'delivery truck cargo logistics shipping package' },
      { char: '🚛', name: 'articulated lorry semi truck big rig highway' },
      { char: '🚜', name: 'tractor farm agriculture field harvest' },
      { char: '🛴', name: 'kick scooter ride push urban commute' },
      { char: '🚲', name: 'bicycle bike pedal ride cycle cycle' },
      { char: '🛵', name: 'motor scooter moped vespa commute urban' },
      { char: '🏍️', name: 'motorcycle motorbike biker fast road ride' },
      { char: '🛺', name: 'auto rickshaw tuk tuk transit asia travel' },
      { char: '🚨', name: 'police car light siren emergency alert alarm red' },
      { char: '🚄', name: 'high-speed train bullet train shinkansen fast transit' },
      { char: '🚅', name: 'bullet train with bullet nose speed japan' },
      { char: '🚈', name: 'light rail transit tram urban commute' },
      { char: '🚂', name: 'locomotive steam train railroad railway engine' },
      { char: '🚆', name: 'train transit rail commute railway trip' },
      { char: '🚇', name: 'metro subway underground transit train tube' },
      { char: '🚊', name: 'tram streetcar trolley city transit' },
      { char: '🚉', name: 'station train railway platform stop transit' },
      { char: '✈️', name: 'airplane plane flight travel trip airport fly vacation' },
      { char: '🛫', name: 'airplane departure takeoff flight travel airport leave' },
      { char: '🛬', name: 'airplane arrival landing flight airport arrive trip' },
      { char: '🛩️', name: 'small airplane private prop charter flight' },
      { char: '💺', name: 'seat chair airplane transit cinema ticket' },
      { char: '🛰️', name: 'satellite orbit space tech gps comms' },
      { char: '🚀', name: 'rocket space launch ship blastoff fast moon startup growth' },
      { char: '🛸', name: 'flying saucer ufo alien extraterrestrial sci-fi' },
      { char: '🚁', name: 'helicopter copter chopper fly air rescue' },
      { char: '🛶', name: 'canoe kayak paddle river boat lake' },
      { char: '⛵', name: 'sailboat yacht ocean wind water travel sail' },
      { char: '🚤', name: 'speedboat motorboat water fast lake marine' },
      { char: '🛥️', name: 'motor boat yacht cruise luxury luxury sea' },
      { char: '🛳️', name: 'passenger ship cruise liner vessel holiday ocean' },
      { char: '⛴️', name: 'ferry boat water transit commute commute island' },
      { char: '🚢', name: 'ship cargo vessel freight sea cruise' },
      { char: '⚓', name: 'anchor nautical ship marine navy harbour' },
      { char: '⛽', name: 'fuel pump gas station petrol gasoline oil car' },
      { char: '🚦', name: 'traffic light vertical stoplight signal street drive' },
      { char: '🚥', name: 'traffic light horizontal street drive signal' },
      { char: '🗺️', name: 'world map atlas geography travel navigate guide' },
      { char: '🗿', name: 'moai easter island stone statue monument' },
      { char: '🗽', name: 'statue of liberty new york nyc america freedom' },
      { char: '🗼', name: 'tokyo tower japan landmark red radio' },
      { char: '🏰', name: 'castle fairytale kingdom disney fort fortress' },
      { char: '🏯', name: 'japanese castle historic landmark pagoda' },
      { char: '🏟️', name: 'stadium arena sports concert crowd venue' },
      { char: '🎡', name: 'ferris wheel carnival theme park ride amusement' },
      { char: '🎢', name: 'roller coaster theme park ride thrills scream' },
      { char: '🌍', name: 'globe showing Europe-Africa earth world planet' },
      { char: '🌎', name: 'globe showing Americas earth world planet' },
      { char: '🌏', name: 'globe showing Asia-Australia earth world planet' },
      { char: '🌐', name: 'globe with meridians internet web global worldwide' },
      { char: '🧭', name: 'compass navigation orient direction explorer north' },
      { char: '🏔️', name: 'snow-capped mountain summit peaks hike cold' },
      { char: '⛰️', name: 'mountain nature climb high outdoors trail' },
      { char: '🌋', name: 'volcano lava eruption magma mountain smoke' },
      { char: '🗻', name: 'mount fuji japan mountain volcano landmark' },
      { char: '🏕️', name: 'camping tent outdoors nature wilderness fire' },
      { char: '🏖️', name: 'beach with umbrella ocean sea sand summer vacation' },
      { char: '🏜️', name: 'desert sand dunes hot sahara dry arid' },
      { char: '🏝️', name: 'desert island tropical beach ocean vacation isolated' },
      { char: '🏞️', name: 'national park scenic nature landscape mountains' },
      { char: '🏛️', name: 'classical building museum bank government column' },
      { char: '🏗️', name: 'building construction crane site build architecture' },
      { char: '🧱', name: 'brick masonry wall build foundation solid' },
      { char: '🏘️', name: 'houses neighborhood suburb community homes' },
      { char: '🏠', name: 'house home building residence living domestic' },
      { char: '🏡', name: 'house with garden home residence lawn suburban' },
      { char: '🏢', name: 'office building corporate commercial work business' },
      { char: '🏣', name: 'japanese post office mail building' },
      { char: '🏤', name: 'post office mail postal letter package' },
      { char: '🏥', name: 'hospital medical emergency health doctor clinic' },
      { char: '🏦', name: 'bank money finance deposit savings vault' },
      { char: '🏨', name: 'hotel building room stay travel suite' },
      { char: '🏪', name: 'convenience store 24-7 7-eleven shop retail' },
      { char: '🏫', name: 'school education building university learn class' },
      { char: '🏬', name: 'department store shopping mall retail market' },
      { char: '🏭', name: 'factory industrial manufacturing plant pollution' },
      { char: '💒', name: 'wedding chapel church romance marriage love' },
      { char: '⛪', name: 'church religion chapel christian parish' },
      { char: '🕌', name: 'mosque islam muslim prayer minaret' },
      { char: '🛕', name: 'hindu temple temple worship deity shrine' },
      { char: '🕍', name: 'synagogue jewish judaism temple worship' },
      { char: '⛩️', name: 'shinto shrine torii gate japan sacred temple' },
      { char: '🕋', name: 'kaaba mecca islam pilgrimage hajj sacred' },
      { char: '⛲', name: 'fountain water spray park square architecture' },
      { char: '⛺', name: 'tent camping outdoors scout shelter' },
      { char: '🌁', name: 'foggy bridge golden gate fog mist morning' },
      { char: '🌃', name: 'night with stars cityscape skyscrapers evening dark' },
      { char: '🏙️', name: 'cityscape city skyline downtown skyscrapers towers' },
      { char: '🌄', name: 'sunrise over mountains dawn morning sunrise early' },
      { char: '🌅', name: 'sunrise dawn morning sun ocean horizon' },
      { char: '🌆', name: 'cityscape at dusk sunset evening skyline twilight' },
      { char: '🌇', name: 'sunset dusk evening twilight golden hour' },
      { char: '🌉', name: 'bridge at night suspended river crossing lights' }
    ]
  },
  {
    id: 'objects',
    name: 'Objects & Tech',
    icon: Lightbulb,
    emojis: [
      { char: '⌚', name: 'watch apple watch smartwatch time clock wrist' },
      { char: '📱', name: 'mobile phone iphone smartphone screen cell mobile tech' },
      { char: '📲', name: 'mobile phone with arrow call app download incoming' },
      { char: '💻', name: 'laptop macbook computer work tech pc coding' },
      { char: '⌨️', name: 'keyboard computer type coding keys mechanical' },
      { char: '🖥️', name: 'desktop computer monitor display imac workstation' },
      { char: '🖨️', name: 'printer print paper document office' },
      { char: '🖱️', name: 'computer mouse click cursor scroll tech' },
      { char: '🖲️', name: 'trackball mouse tech cursor control' },
      { char: '🕹️', name: 'joystick arcade retro game controller retro' },
      { char: '🗜️', name: 'clamp tool compress vice engineering' },
      { char: '💽', name: 'minidisc disk optical retro media' },
      { char: '💾', name: 'floppy disk save 3.5 disk storage retro retro' },
      { char: '💿', name: 'optical disk cd rom music media shiny' },
      { char: '📀', name: 'dvd disc movie video media gold' },
      { char: '📼', name: 'videocassette vhs tape retro recording retro' },
      { char: '📷', name: 'camera photo picture snapshot capture instagram' },
      { char: '📸', name: 'camera with flash photo photograph snapshot flash' },
      { char: '📹', name: 'video camera camcorder recording film tape' },
      { char: '🎥', name: 'movie camera film cinema hollywood recording' },
      { char: '📽️', name: 'film projector movie cinema theater retro' },
      { char: '🎞️', name: 'film frames movie cinema strip reels' },
      { char: '📞', name: 'telephone receiver call contact phone audio' },
      { char: '☎️', name: 'telephone landline rotary dial call phone' },
      { char: '📟', name: 'pager beeper 90s retro message comms' },
      { char: '📠', name: 'fax machine office document telecopier paper' },
      { char: '📺', name: 'television tv screen show broadcast retro' },
      { char: '📻', name: 'radio broadcast fm am sound tune music' },
      { char: '🎙️', name: 'studio microphone audio recording podcast speech broadcast' },
      { char: '🎚️', name: 'level slider fader studio audio control volume' },
      { char: '🎛️', name: 'control knobs dials audio synthesizer studio' },
      { char: '⏱️', name: 'stopwatch timer racing sprint measure count' },
      { char: '⏲️', name: 'timer clock kitchen countdown interval' },
      { char: '⏰', name: 'alarm clock morning wake up time ring alert' },
      { char: '🕰️', name: 'mantelpiece clock vintage antique time pendulum' },
      { char: '⌛', name: 'hourglass done time sand expired finished' },
      { char: '⏳', name: 'hourglass not done time sand running loading wait' },
      { char: '📡', name: 'satellite antenna dish space broadcast comms wifi' },
      { char: '🔋', name: 'battery charge energy power phone level green' },
      { char: '🔌', name: 'electric plug power wall outlet cord electric' },
      { char: '💡', name: 'light bulb idea innovation bright insight light creative' },
      { char: '🔦', name: 'flashlight torch dark search explore light' },
      { char: '🕯️', name: 'candle flame wax light aroma romance' },
      { char: '🧯', name: 'fire extinguisher safety put out emergency' },
      { char: '🛢️', name: 'oil drum barrel petroleum crude fuel' },
      { char: '💸', name: 'money with wings flying away spend lost cash profit' },
      { char: '💵', name: 'dollar banknote cash money payment currency bills' },
      { char: '💴', name: 'yen banknote japan cash money currency' },
      { char: '💶', name: 'euro banknote europe cash money currency' },
      { char: '💷', name: 'pound banknote uk britain cash money sterling' },
      { char: '🪙', name: 'coin money gold crypto cash payment token' },
      { char: '💰', name: 'money bag rich wealth cash fortune treasure profit' },
      { char: '💳', name: 'credit card payment purchase visa mastercard bank debit' },
      { char: '💎', name: 'gem stone diamond precious jewel luxury rare rich' },
      { char: '⚖️', name: 'balance scale justice law court legal fairness' },
      { char: '🪜', name: 'ladder climb reach step career upgrade' },
      { char: '🧰', name: 'toolbox tools fix maintenance kit build' },
      { char: '🪛', name: 'screwdriver tool turn fix hardware repair' },
      { char: '🔧', name: 'wrench tool spanner fix mechanics adjust' },
      { char: '🔨', name: 'hammer tool build hit nail strike smash' },
      { char: '⚒️', name: 'hammer and pick tools mining forge construct' },
      { char: '🛠️', name: 'hammer and wrench settings tools configure fix customize' },
      { char: '⛏️', name: 'pickaxe tool mining quarry craft strike' },
      { char: '🪚', name: 'carpentry saw wood cut tool blade' },
      { char: '🔩', name: 'nut and bolt hardware screw metal hardware fix' },
      { char: '⚙️', name: 'gear cog setting system engineering workflow machine' },
      { char: '🧲', name: 'magnet attraction pull force pole red' },
      { char: '💣', name: 'bomb explosive blast impact danger fuse' },
      { char: '🧨', name: 'firecracker explosive celebration fireworks red' },
      { char: '🪓', name: 'axe chop wood blade woodcutter weapon' },
      { char: '🔪', name: 'kitchen knife blade chef cut slice cook' },
      { char: '🗡️', name: 'dagger blade sword combat weapon sharp' },
      { char: '⚔️', name: 'crossed swords fight battle war combat gaming' },
      { char: '🛡️', name: 'shield security protect defense secure safeguard privacy' },
      { char: '🔮', name: 'crystal ball fortune teller future psychic predict' },
      { char: '📿', name: 'prayer beads rosary religion meditate spiritual' },
      { char: '🧿', name: 'nazar amulet evil eye protection blue charm' },
      { char: '💈', name: 'barber pole haircut styling salon spiral' },
      { char: '⚗️', name: 'alembic chemistry lab flask science experiment' },
      { char: '🔭', name: 'telescope astronomy stars space galaxy look observe' },
      { char: '🔬', name: 'microscope science laboratory biology research medical' },
      { char: '💊', name: 'pill capsule medicine health pharmacy drug doctor' },
      { char: '💉', name: 'syringe vaccine shot doctor blood injection medical' },
      { char: '🩸', name: 'drop of blood bleed donate medical red' },
      { char: '🩹', name: 'adhesive bandage band-aid heal wound first aid' },
      { char: '🩺', name: 'stethoscope doctor nurse medicine checkup heartbeat' },
      { char: '🚪', name: 'door entrance open exit room house threshold' },
      { char: '🪞', name: 'mirror reflection glass look vanity' },
      { char: '🪟', name: 'window glass view sunshine outside room' },
      { char: '🛏️', name: 'bed sleep rest hotel furniture mattress' },
      { char: '🛋️', name: 'couch and lamp sofa living room furniture chill relax' },
      { char: '🪑', name: 'chair seat sit desk furniture' },
      { char: '🚽', name: 'toilet restroom bathroom porcelain bowl flush' },
      { char: '🪠', name: 'plunger toilet suction tool fix bathroom' },
      { char: '🚿', name: 'shower bathroom clean water spray wash' },
      { char: '🛁', name: 'bathtub soak bath foam wash relax' },
      { char: '🪤', name: 'mouse trap trap catch cheese spring' },
      { char: '🪒', name: 'razor shave blade groom smooth bar' },
      { char: '🧴', name: 'lotion bottle moisturizer cream shampoo soap pump' },
      { char: '🧷', name: 'safety pin pin diaper fasten metal' },
      { char: '🧹', name: 'broom sweep clean witch floor bristle' },
      { char: '🧺', name: 'basket laundry wicker picnic woven' },
      { char: '🧻', name: 'roll of paper toilet paper tissue wipe clean' },
      { char: '🪣', name: 'bucket pail water mop wash chore' },
      { char: '🧼', name: 'soap bar clean wash hygiene bubbles' },
      { char: '🪥', name: 'toothbrush hygiene dental brush teeth clean' },
      { char: '🧽', name: 'sponge clean wash dishes soak squeeze' },
      { char: '🔑', name: 'key access password unlock security lock secret key' },
      { char: '🗝️', name: 'old key antique lock password access secret' },
      { char: '🔒', name: 'locked padlock security safe closed privacy secure' },
      { char: '🔓', name: 'unlocked padlock open accessible security unsecure' },
      { char: '📦', name: 'package cardboard box shipping delivery order parcel' },
      { char: '📫', name: 'closed mailbox with raised flag mail post letter' },
      { char: '📬', name: 'open mailbox with raised flag mail delivery letter' },
      { char: '📮', name: 'postbox letterbox post mail red royal' },
      { char: '✉️', name: 'envelope email letter message mail contact send' },
      { char: '📧', name: 'e-mail letter inbox message electronic mail' },
      { char: '📨', name: 'incoming envelope receive incoming mail message' },
      { char: '📩', name: 'envelope with arrow send mail dispatch outgoing' },
      { char: '📤', name: 'outbox tray dispatch send message mail' },
      { char: '📥', name: 'inbox tray receive message mail incoming' },
      { char: '🏷️', name: 'label tag price ticket brand discount sale' },
      { char: '💼', name: 'briefcase work job business portfolio career portfolio' },
      { char: '📁', name: 'file folder directory organize storage documents' },
      { char: '📂', name: 'open file folder directory explore browse' },
      { char: '📅', name: 'calendar date schedule schedule plan day agenda' },
      { char: '📆', name: 'tear-off calendar date day appointment schedule' },
      { char: '🗓️', name: 'spiral calendar date month schedule plan' },
      { char: '📈', name: 'chart increasing upward trend growth stats stocks sales' },
      { char: '📉', name: 'chart decreasing downward trend drop loss fall down' },
      { char: '📊', name: 'bar chart analytics statistics metrics data report graph' },
      { char: '📋', name: 'clipboard tasks list survey todo check audit' },
      { char: '📌', name: 'pushpin pin location notice board tack' },
      { char: '📍', name: 'round pushpin map pin location here destination' },
      { char: '📎', name: 'paperclip attach attachment file link document' },
      { char: '🖇️', name: 'linked paperclips attach join connect' },
      { char: '📏', name: 'straight ruler measure length distance scale' },
      { char: '📐', name: 'triangular ruler geometry math measure angle' },
      { char: '✂️', name: 'scissors cut snip shear trim tool' },
      { char: '📝', name: 'memo notepad note write draft pencil document' },
      { char: '✏️', name: 'pencil write draw edit draft sketch' },
      { char: '✒️', name: 'black nib fountain pen ink signature author write' },
      { char: '🖋️', name: 'fountain pen write ink author calligraphy signature' },
      { char: '🖊️', name: 'pen ballpoint write document signature ink' },
      { char: '🖌️', name: 'paintbrush paint art draw color design stroke' },
      { char: '🖍️', name: 'crayon draw color wax sketch kid' },
      { char: '🔍', name: 'magnifying glass tilted left search find look investigate' },
      { char: '🔎', name: 'magnifying glass tilted right search find look inspect' }
    ]
  },
  {
    id: 'symbols',
    name: 'Symbols & Signs',
    icon: Heart,
    emojis: [
      { char: '❤️', name: 'red heart love passion romance favorite like' },
      { char: '🧡', name: 'orange heart friendship warmth love' },
      { char: '💛', name: 'yellow heart loyalty gold happiness bright' },
      { char: '💚', name: 'green heart nature organic health jealousy' },
      { char: '💙', name: 'blue heart trust loyalty peace calm' },
      { char: '💜', name: 'purple heart royalty luxury magic honor' },
      { char: '🤎', name: 'brown heart earth chocolate warmth' },
      { char: '🖤', name: 'black heart dark goth sorrow alternative' },
      { char: '🤍', name: 'white heart pure peace angel clean' },
      { char: '💔', name: 'broken heart heartbreak sad grief break split' },
      { char: '❣️', name: 'heart exclamation emphasis excited love' },
      { char: '💕', name: 'two hearts floating love affection' },
      { char: '💞', name: 'revolving hearts love dance affection' },
      { char: '💓', name: 'beating heart pulse heartbeat love alive' },
      { char: '💗', name: 'growing heart expanding love flutter excited' },
      { char: '💖', name: 'sparkling heart shiny love special glitter' },
      { char: '💘', name: 'heart with arrow cupid romance love strike' },
      { char: '💝', name: 'heart with ribbon gift present love valentine' },
      { char: '💟', name: 'heart decoration love purple square badge' },
      { char: '☮️', name: 'peace symbol harmony pacifism war no' },
      { char: '✝️', name: 'latin cross christianity church faith cross' },
      { char: '☪️', name: 'star and crescent islam muslim religion symbol' },
      { char: '🕉️', name: 'om hinduism sacred sound mantra spiritual' },
      { char: '☸️', name: 'wheel of dharma buddhism dharma spiritual' },
      { char: '✡️', name: 'star of david judaism jewish star hexagram' },
      { char: '🔯', name: 'six-pointed star with middle dot hexagram' },
      { char: '🕎', name: 'menorah hanukkah judaism candles candelabrum' },
      { char: '☯️', name: 'yin yang balance daoism harmony dual' },
      { char: '☦️', name: 'orthodox cross christianity church' },
      { char: '🛐', name: 'place of worship pray religion shrine spiritual' },
      { char: '⛎', name: 'ophiuchus 13th zodiac constellation sign' },
      { char: '♈', name: 'aries ram zodiac horoscope astrological' },
      { char: '♉', name: 'taurus bull zodiac horoscope astrological' },
      { char: '♊', name: 'gemini twins zodiac horoscope astrological' },
      { char: '♋', name: 'cancer crab zodiac horoscope astrological' },
      { char: '♌', name: 'leo lion zodiac horoscope astrological' },
      { char: '♍', name: 'virgo maiden zodiac horoscope astrological' },
      { char: '♎', name: 'libra balance scales zodiac horoscope astrological' },
      { char: '♏', name: 'scorpio scorpion zodiac horoscope astrological' },
      { char: '♐', name: 'sagittarius archer zodiac horoscope astrological' },
      { char: '♑', name: 'capricorn goat zodiac horoscope astrological' },
      { char: '♒', name: 'aquarius water bearer zodiac horoscope astrological' },
      { char: '♓', name: 'pisces fish zodiac horoscope astrological' },
      { char: '🆔', name: 'id button identity badge credential account' },
      { char: '⚛️', name: 'atom symbol science physics quantum chemistry' },
      { char: '🉑', name: 'japanese acceptable button pass approve' },
      { char: '☢️', name: 'radioactive radiation nuclear hazard warning danger' },
      { char: '☣️', name: 'biohazard biological hazard warning toxic virus' },
      { char: '📴', name: 'mobile phone off power silent mute' },
      { char: '📳', name: 'vibration mode mobile phone vibrate buzz' },
      { char: '🈶', name: 'japanese not free of charge paid button' },
      { char: '🈚', name: 'japanese free of charge complimentary free' },
      { char: '🈸', name: 'japanese application button apply form' },
      { char: '🈺', name: 'japanese open for business button business store' },
      { char: '🈷️', name: 'japanese monthly amount button month' },
      { char: '✴️', name: 'eight-pointed star starburst sparkle symbol' },
      { char: '🆚', name: 'vs button versus battle fight match duel' },
      { char: '💮', name: 'white flower well done school stamp rosette' },
      { char: '🉐', name: 'japanese bargain button discount deal bargain' },
      { char: '㊙️', name: 'japanese secret button confidential private secret' },
      { char: '㊗️', name: 'japanese congratulations button celebration' },
      { char: '🈴', name: 'japanese passing grade button exam pass approved' },
      { char: '🈵', name: 'japanese no vacancy button full capacity booked' },
      { char: '🈹', name: 'japanese discount button sale cut percent' },
      { char: '🈲', name: 'japanese prohibited button banned forbidden no' },
      { char: '🅰️', name: 'a button blood type letter alphabet' },
      { char: '🅱️', name: 'b button blood type letter alphabet' },
      { char: '🆎', name: 'ab button blood type letter alphabet' },
      { char: '🆑', name: 'cl button clear button delete' },
      { char: '🅾️', name: 'o button blood type letter alphabet circle' },
      { char: '🆘', name: 'sos button emergency distress help save' },
      { char: '❌', name: 'cross mark cancel error wrong x fail delete' },
      { char: '⭕', name: 'heavy large circle correct approved right circle' },
      { char: '🛑', name: 'stop sign octagonal red halt warning cease' },
      { char: '⛔', name: 'no entry road sign forbidden access barred' },
      { char: '📛', name: 'name badge identifier tag tulip label' },
      { char: '🚫', name: 'prohibited no sign forbidden ban restricted' },
      { char: '💯', name: 'hundred points 100 percent perfect score a+ complete' },
      { char: '💢', name: 'anger symbol manga mad cartoon furious vein' },
      { char: '♨️', name: 'hot springs steam spa bath onsen warm' },
      { char: '🚷', name: 'no pedestrians walking forbidden crossing ban' },
      { char: '🚯', name: 'no littering trash ban garbage prohibited' },
      { char: '🚳', name: 'no bicycles biking ban prohibited ride' },
      { char: '🚱', name: 'non-potable water no drink faucet tap' },
      { char: '🔞', name: 'no one under eighteen 18 adult mature restricted' },
      { char: '📵', name: 'no mobile phones ban silent airplane phone' },
      { char: '🚭', name: 'no smoking cigarette prohibited clean air' },
      { char: '❗', name: 'red exclamation mark alert warning attention urgent' },
      { char: '❓', name: 'red question mark ask query wonder help' },
      { char: '❕', name: 'white exclamation mark alert attention light' },
      { char: '❔', name: 'white question mark query help ask' },
      { char: '‼️', name: 'double exclamation mark shock emergency loud surprise' },
      { char: '⁉️', name: 'exclamation question mark what shock confuse really' },
      { char: '🔅', name: 'dim button brightness low display light' },
      { char: '🔆', name: 'bright button brightness high display sunshine' },
      { char: '〽️', name: 'part alternation mark singing chant traditional' },
      { char: '⚠️', name: 'warning sign caution danger alert hazard notice' },
      { char: '🚸', name: 'children crossing road sign caution school kids' },
      { char: '🔱', name: 'trident emblem poseidon neptune pitchfork spear' },
      { char: '⚜️', name: 'fleur-de-lis french royal lily emblem heraldic' },
      { char: '🔰', name: 'japanese symbol for beginner rookie driver new fresh' },
      { char: '♻️', name: 'recycling symbol green reuse reduce planet eco' },
      { char: '✅', name: 'check mark button verify done success correct pass green tick' },
      { char: '🈯', name: 'japanese reserved button booking booked' },
      { char: '💹', name: 'chart increasing with yen market economy growth' },
      { char: '❇️', name: 'sparkle green starburst shine clean new' },
      { char: '✳️', name: 'eight-spoked asterisk star note reference' },
      { char: '❎', name: 'cross mark button no cancel square x' },
      { char: '🌐', name: 'globe with meridians web www internet world global' },
      { char: '💠', name: 'diamond with a dot cute diamond blue flower' },
      { char: 'Ⓜ️', name: 'circled m metro subway transit mark' },
      { char: '🌀', name: 'cyclone hurricane spiral weather spin dizzy' },
      { char: '💤', name: 'zzz sleep tired snoring bored z' },
      { char: '🏧', name: 'atm sign automated teller cash machine bank money' },
      { char: '🚾', name: 'water closet wc toilet restroom bathroom' },
      { char: '♿', name: 'wheelchair symbol accessible handicap access' },
      { char: '🅿️', name: 'p button parking lot car garage blue' },
      { char: '🈳', name: 'japanese vacancy button available open room' },
      { char: '🈂️', name: 'japanese service charge button free service' },
      { char: '🛂', name: 'passport control customs airport immigration border' },
      { char: '🛃', name: 'customs declaration inspection border luggage' },
      { char: '🛄', name: 'baggage claim luggage carousel airport suitcase' },
      { char: '🛅', name: 'left luggage locker baggage storage bag' },
      { char: '🚹', name: 'mens room restroom toilet male man' },
      { char: '🚺', name: 'womens room restroom toilet female woman' },
      { char: '🚼', name: 'baby symbol change station nursery infant' },
      { char: '⚧', name: 'transgender symbol gender pride identity' },
      { char: '🚻', name: 'restroom bathroom toilet unisex both' },
      { char: '🚮', name: 'litter in bin sign trash garbage clean disposal' },
      { char: '🎦', name: 'cinema theater film movie show screen' },
      { char: '📶', name: 'antenna bars cell reception signal mobile wifi bars' },
      { char: '🈁', name: 'japanese here button destination location' },
      { char: '🆖', name: 'ng button no good blooper fail reject' },
      { char: '🆗', name: 'ok button fine agree approve good perfect' },
      { char: '🆙', name: 'up button level up increase upgrade high' },
      { char: '🆒', name: 'cool button awesome fine chill neat' },
      { char: '🆕', name: 'new button fresh release update arrival' },
      { char: '🆓', name: 'free button complimentary zero cost no charge' },
      { char: '🔟', name: 'keycap 10 ten score perfect grade' },
      { char: '🔢', name: 'input numbers digits count 1234 keypad' },
      { char: '▶️', name: 'play button media start stream resume video' },
      { char: '⏸️', name: 'pause button media hold wait freeze video' },
      { char: '⏯️', name: 'play or pause button toggle media control' },
      { char: '⏹️', name: 'stop button media end halt terminate' },
      { char: '⏺️', name: 'record button media audio video recording' },
      { char: '⏭️', name: 'next track button forward skip media' },
      { char: '⏮️', name: 'last track button rewind previous media' },
      { char: '⏩', name: 'fast-forward button speed ahead media' },
      { char: '⏪', name: 'fast reverse button rewind backward media' },
      { char: '⏫', name: 'fast up button increase high scroll' },
      { char: '⏬', name: 'fast down button decrease low scroll' },
      { char: '◀️', name: 'reverse button back previous media' },
      { char: '🔼', name: 'upwards button up triangle' },
      { char: '🔽', name: 'downwards button down triangle' },
      { char: '➡️', name: 'right arrow forward proceed next direction' },
      { char: '⬅️', name: 'left arrow back return previous direction' },
      { char: '⬆️', name: 'up arrow above top upward direction' },
      { char: '⬇️', name: 'down arrow below bottom downward direction' },
      { char: '↗️', name: 'up-right arrow diagonal growth increase' },
      { char: '↘️', name: 'down-right arrow diagonal drop decrease' },
      { char: '↙️', name: 'down-left arrow diagonal return' },
      { char: '↖️', name: 'up-left arrow diagonal back' },
      { char: '↕️', name: 'up-down arrow vertical scroll adjust' },
      { char: '↔️', name: 'left-right arrow horizontal expand swap' },
      { char: '🔄', name: 'counterclockwise arrows button refresh sync reload update' },
      { char: '↪️', name: 'left arrow curving right hook curve reply' },
      { char: '↩️', name: 'right arrow curving left return back undo' },
      { char: '🔃', name: 'clockwise vertical arrows refresh loop rotate' },
      { char: '🔀', name: 'shuffle tracks button random mix playlist' },
      { char: '🔁', name: 'repeat button loop replay playlist again' },
      { char: '🔂', name: 'repeat single track button repeat 1 one' },
      { char: '➕', name: 'plus sign add addition math positive extra' },
      { char: '➖', name: 'minus sign subtract deduction math negative' },
      { char: '➗', name: 'division sign divide math split fraction' },
      { char: '✖️', name: 'multiplication sign multiply times cancel x' },
      { char: '♾️', name: 'infinity infinite endless forever loop' },
      { char: '💲', name: 'heavy dollar sign money usd currency cost price' },
      { char: '💱', name: 'currency exchange foreign forex trade rate' },
      { char: '™️', name: 'trade mark brand trademark legal registered' },
      { char: '©️', name: 'copyright copyright legal rights author' },
      { char: '®️', name: 'registered registered brand mark legal' },
      { char: '✔️', name: 'heavy check mark done verify right tick success' },
      { char: '☑️', name: 'ballot box with check vote checked select option' },
      { char: '🔘', name: 'radio button choice select option mark' },
      { char: '🔴', name: 'red circle live record bullet dot red' },
      { char: '🟠', name: 'orange circle bullet dot round orange' },
      { char: '🟡', name: 'yellow circle bullet dot round yellow' },
      { char: '🟢', name: 'green circle online active status dot green' },
      { char: '🔵', name: 'blue circle bullet dot round blue' },
      { char: '🟣', name: 'purple circle bullet dot round purple' },
      { char: '🟤', name: 'brown circle bullet dot round brown' },
      { char: '⚫', name: 'black circle dot bullet dark black' },
      { char: '⚪', name: 'white circle dot bullet empty white' },
      { char: '🟥', name: 'red square block tile red' },
      { char: '🟧', name: 'orange square block tile orange' },
      { char: '🟨', name: 'yellow square block tile yellow' },
      { char: '🟩', name: 'green square block tile green' },
      { char: '🟦', name: 'blue square block tile blue' },
      { char: '🟪', name: 'purple square block tile purple' },
      { char: '🟫', name: 'brown square block tile brown' },
      { char: '⬛', name: 'black large square block tile black' },
      { char: '⬜', name: 'white large square block tile white' }
    ]
  },
  {
    id: 'flags',
    name: 'Flags & Banners',
    icon: Flag,
    emojis: [
      { char: '🏁', name: 'chequered flag race finish line winner end checkered' },
      { char: '🚩', name: 'triangular flag post marker goal alert red flag' },
      { char: '🎌', name: 'crossed flags celebration japan festive' },
      { char: '🏴', name: 'black flag pirate dark wave' },
      { char: '🏳️', name: 'white flag surrender peace truce' },
      { char: '🏳️‍🌈', name: 'rainbow flag pride lgbtq queer diversity' },
      { char: '🏳️‍⚧️', name: 'transgender flag trans pride identity' },
      { char: '🏴‍☠️', name: 'pirate flag skull crossbones jolly roger corsair' },
      { char: '🇺🇸', name: 'flag United States USA America' },
      { char: '🇬🇧', name: 'flag United Kingdom UK Britain England London' },
      { char: '🇨🇦', name: 'flag Canada Canadian maple leaf' },
      { char: '🇦🇺', name: 'flag Australia Aussie Sydney' },
      { char: '🇮🇳', name: 'flag India Indian tricolor Bharat' },
      { char: '🇩🇪', name: 'flag Germany German Deutschland Berlin' },
      { char: '🇫🇷', name: 'flag France French Paris Europe' },
      { char: '🇯🇵', name: 'flag Japan Japanese Tokyo' },
      { char: '🇨🇳', name: 'flag China Chinese Beijing' },
      { char: '🇧🇷', name: 'flag Brazil Brazilian samba' },
      { char: '🇲🇽', name: 'flag Mexico Mexican Aztec' },
      { char: '🇰🇷', name: 'flag South Korea Korean Seoul K-pop' },
      { char: '🇮🇹', name: 'flag Italy Italian Rome pizza' },
      { char: '🇪🇸', name: 'flag Spain Spanish Madrid Europe' },
      { char: '🇷🇺', name: 'flag Russia Russian Moscow' },
      { char: '🇿🇦', name: 'flag South Africa African rainbow' },
      { char: '🇸🇦', name: 'flag Saudi Arabia Riyadh Arabic' },
      { char: '🇦🇪', name: 'flag United Arab Emirates UAE Dubai' },
      { char: '🇨🇭', name: 'flag Switzerland Swiss Alps cross' },
      { char: '🇸🇪', name: 'flag Sweden Swedish Stockholm' },
      { char: '🇳🇴', name: 'flag Norway Norwegian Oslo fjord' },
      { char: '🇩🇰', name: 'flag Denmark Danish Copenhagen' },
      { char: '🇳🇱', name: 'flag Netherlands Dutch Holland Amsterdam' },
      { char: '🇧🇪', name: 'flag Belgium Belgian Brussels' },
      { char: '🇮🇩', name: 'flag Indonesia Indonesian Jakarta' },
      { char: '🇵🇭', name: 'flag Philippines Filipino Manila' },
      { char: '🇻🇳', name: 'flag Vietnam Vietnamese Hanoi' },
      { char: '🇹🇭', name: 'flag Thailand Thai Bangkok' },
      { char: '🇹🇷', name: 'flag Turkey Turkish Istanbul' },
      { char: '🇪🇬', name: 'flag Egypt Egyptian Cairo pyramids' },
      { char: '🇳🇬', name: 'flag Nigeria Nigerian Lagos Africa' },
      { char: '🇦🇷', name: 'flag Argentina Argentine Buenos Aires' },
      { char: '🇨🇱', name: 'flag Chile Chilean Santiago' },
      { char: '🇨🇴', name: 'flag Colombia Colombian Bogota' },
      { char: '🇵🇪', name: 'flag Peru Peruvian Lima Andes' },
      { char: '🇳🇿', name: 'flag New Zealand Kiwi Auckland' }
    ]
  }
];

const LOCAL_STORAGE_KEY = 'socialsync_recent_emojis';
const MAX_RECENT = 24;

export function EmojiPicker({ onSelect, onClose, align = 'right', className = '' }) {
  const [placement, setPlacement] = useState('bottom');
  const [activeCategory, setActiveCategory] = useState('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState([]);
  const pickerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Load recently used emojis from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentEmojis(parsed);
          // Default to 'smileys' so the user is not locked into only seeing recent emojis
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Calculate smart placement based on available viewport space
  useEffect(() => {
    const updatePlacement = () => {
      if (!pickerRef.current) return;
      const parent = pickerRef.current.parentElement;
      const anchorRect = parent?.getBoundingClientRect() || pickerRef.current.getBoundingClientRect();
      const spaceAbove = anchorRect.top;
      const spaceBelow = window.innerHeight - anchorRect.bottom;

      // When anchor is near the top of the viewport (spaceAbove < 380), open DOWNWARDS so search/tabs are never cut off
      if (spaceBelow >= 360) {
        setPlacement('bottom');
      } else if (spaceAbove >= 360) {
        setPlacement('top');
      } else {
        setPlacement(spaceBelow >= spaceAbove ? 'bottom' : 'top');
      }
    };

    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, []);

  // Close on Escape or click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.();
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Handle emoji selection & save to recent
  const handleEmojiClick = (char) => {
    onSelect?.(char);

    // Update recent emojis in localStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const existing = stored ? JSON.parse(stored) : [];
      const updated = [char, ...existing.filter((e) => e !== char)].slice(0, MAX_RECENT);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

      // Only update local state if NOT currently on 'recent' tab
      // This prevents the emoji grid from unexpectedly jumping under the user's cursor while clicking
      if (activeCategory !== 'recent') {
        setRecentEmojis(updated);
      }
    } catch {
      // Ignore localStorage errors
    }
  };

  // Clear all recently chosen emojis
  const handleClearRecentEmojis = (e) => {
    e?.stopPropagation();
    setRecentEmojis([]);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {
      // Ignore error
    }
    setActiveCategory('smileys');
  };

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const results = [];
    const seen = new Set();

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (!seen.has(item.char) && (item.name.toLowerCase().includes(q) || item.char.includes(q))) {
          seen.add(item.char);
          results.push(item);
        }
      }
    }

    return results;
  }, [searchQuery]);

  // Current category emojis
  const currentCategoryData = useMemo(() => {
    if (activeCategory === 'recent') {
      return {
        id: 'recent',
        name: 'Recently Used',
        emojis: recentEmojis.map((char) => ({ char, name: 'recent emoji' }))
      };
    }
    return EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  }, [activeCategory, recentEmojis]);

  return (
    <div
      ref={pickerRef}
      className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} ${
        placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
      } z-50 w-80 sm:w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-up ring-1 ring-black/5 ${className}`}
      style={{ maxHeight: 'min(420px, calc(100vh - 80px))' }}
      role="dialog"
      aria-label="Emoji Picker"
    >
      {/* Search Header */}
      <div className="p-3 border-b border-[#E2E8F0] dark:border-[#334155] bg-slate-50/70 dark:bg-[#1E293B]/60">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all emojis (e.g. smile, fire, heart, flag)..."
              className="w-full text-xs pl-8 pr-7 py-2 rounded-xl bg-white dark:bg-[#0B1120] text-[#0F172A] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#334155] focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-slate-400"
              autoFocus
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-[#334155] transition-all"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Categories Bar (hidden if searching) */}
      {!searchQuery && (
        <div className="flex items-center gap-1 p-1.5 border-b border-[#E2E8F0] dark:border-[#334155] overflow-x-auto scrollbar-none bg-slate-50/40 dark:bg-[#0B1120]/40 shrink-0">
          {recentEmojis.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategory('recent')}
              className={`p-1.5 rounded-xl text-xs transition-all flex items-center justify-center shrink-0 ${
                activeCategory === 'recent'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1E293B]'
              }`}
              title="Recently Used"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
          )}

          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-xl text-xs transition-all flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1E293B]'
                }`}
                title={cat.name}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>
      )}

      {/* Emoji Grid Content */}
      <div className="flex-1 p-3 overflow-y-auto max-h-64 sm:max-h-72">
        {searchQuery ? (
          <div>
            <div className="text-[11px] font-semibold text-slate-400 mb-2">
              Search Results ({filteredEmojis.length})
            </div>
            {filteredEmojis.length > 0 ? (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {filteredEmojis.map((item, idx) => (
                  <button
                    key={`${item.char}-${idx}`}
                    type="button"
                    onClick={() => handleEmojiClick(item.char)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:scale-125 transition-transform cursor-pointer select-none"
                    title={item.name}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400">
                No emojis matching &ldquo;{searchQuery}&rdquo;
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="text-[11px] font-bold text-[#0F172A] dark:text-[#CBD5E1] mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {activeCategory === 'recent' && <Clock className="w-3.5 h-3.5 text-blue-500" />}
                <span>{currentCategoryData.name}</span>
                <span className="text-[10px] font-normal text-slate-400">
                  ({currentCategoryData.emojis.length})
                </span>
              </div>

              {activeCategory === 'recent' && recentEmojis.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearRecentEmojis}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-800/60 transition-all cursor-pointer"
                  title="Clear all recently used emojis"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Recent</span>
                </button>
              )}
            </div>

            {currentCategoryData.emojis.length > 0 ? (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {currentCategoryData.emojis.map((item, idx) => (
                  <button
                    key={`${item.char}-${idx}`}
                    type="button"
                    onClick={() => handleEmojiClick(item.char)}
                    className="w-9 h-9 flex items-center justify-center text-xl rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:scale-125 active:scale-95 transition-transform cursor-pointer select-none"
                    title={item.name}
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                <p>No recently used emojis.</p>
                <button
                  type="button"
                  onClick={() => setActiveCategory('smileys')}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                >
                  Browse Smileys &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className="px-3 py-1.5 border-t border-[#E2E8F0] dark:border-[#334155] bg-slate-50/50 dark:bg-[#1E293B]/40 flex items-center justify-between text-[10px] text-slate-400">
        <span>Click to insert at cursor</span>
        <span>ESC to close</span>
      </div>
    </div>
  );
}

export default EmojiPicker;
