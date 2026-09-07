const thoughts = {
  random: [
    ["🚪", "Kenapa kalau masuk kamar kita sering lupa mau ngapain?"],
    ["🐟", "Kalau ikan minum air, dia sebenarnya lagi minum atau cuma berenang?"],
    ["🔐", "Kenapa kita bisa ingat lagu dari 2016 tapi lupa password sendiri?"],
    ["🧊", "Kenapa kita buka kulkas padahal tahu isinya cuma itu-itu aja?"],
    ["🦎", "Kalau cicak jatuh dari plafon, dia malu nggak?"],
    ["🍅", "Kalau tomat itu buah, saus tomat berarti smoothie?"],
    ["⌚", "Kenapa disebut jam tangan, padahal jamnya nggak punya tangan?"],
    ["🔢", "Kenapa angka 1 sampai 9 punya nama, tapi 10 malah gabungan?"]
  ],
  absurd: [
    ["🐔", "Ayam tahu nggak kalau manusia menyebutnya ayam?"],
    ["🪑", "Kalau kursi bisa duduk, berarti kita selama ini duduk di atas sesuatu yang sebenarnya bisa duduk?"],
    ["🧦", "Kenapa kaus kaki selalu kehilangan pasangannya, tapi nggak pernah bikin pengumuman kehilangan?"],
    ["🍞", "Kalau roti dipanggang sampai gosong, apakah dia sedang menjalani character development?"],
    ["🐌", "Kalau siput buru-buru, apakah dia tetap terlihat buru-buru?"],
    ["🎒", "Kalau tas kosong disebut tas, kalau tas penuh tetap tas atau sudah berubah status?"]
  ],
  deep: [
    ["🌌", "Kalau masa depan belum terjadi, kenapa kita bisa takut sama masa depan?"],
    ["🧠", "Kalau pikiran kita muncul sendiri, siapa sebenarnya yang memilih untuk berpikir?"],
    ["⏳", "Kapan tepatnya 'sekarang' berubah menjadi 'tadi'?"],
    ["📸", "Kenapa kita lebih gampang mengingat momen yang ingin dilupakan?"],
    ["🌱", "Kalau kita terus berubah setiap hari, kapan terakhir kali kita benar-benar jadi diri kita yang lama?"]
  ],
  night: [
    ["🌙", "Kenapa pertanyaan paling random muncul justru pas mau tidur?"],
    ["🛏️", "Kenapa jam 2 pagi tiba-tiba semua kejadian 5 tahun lalu terasa penting?"],
    ["📱", "Kalau sudah bilang 'satu video lagi', kenapa satu video nggak pernah benar-benar satu?"],
    ["👀", "Kenapa saat mau tidur otak tiba-tiba membuka folder memori yang nggak diminta?"],
    ["💭", "Kenapa ide bagus datang saat nggak bisa langsung dicatat?"]
  ]
};

let currentCategory = "random";
let count = Number(localStorage.getItem("overthinkingCount") || 0);

const thoughtEl = document.getElementById("thought");
const emojiEl = document.getElementById("thoughtEmoji");
const card = document.getElementById("thoughtCard");
const countEl = document.getElementById("count");

countEl.textContent = count;

function generate() {
  const list = thoughts[currentCategory];
  const [emoji, text] = list[Math.floor(Math.random() * list.length)];

  emojiEl.textContent = emoji;
  thoughtEl.textContent = "“" + text + "”";

  card.classList.remove("pop");
  void card.offsetWidth;
  card.classList.add("pop");

  count++;
  countEl.textContent = count;
  localStorage.setItem("overthinkingCount", count);
}

document.querySelectorAll(".category").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelector(".category.active").classList.remove("active");
    btn.classList.add("active");
    currentCategory = btn.dataset.category;
    generate();
  });
});

document.getElementById("generateBtn").addEventListener("click", generate);
document.getElementById("againBtn").addEventListener("click", generate);
