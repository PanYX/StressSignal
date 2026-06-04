import type { Dictionary } from "./dictionary";
import type { Locale } from "./locales";

type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type PartialDeep<T> = T extends Primitive
  ? T
  : T extends Array<infer U>
    ? Array<PartialDeep<U>>
    : {
        [K in keyof T]?: PartialDeep<T[K]>;
      };

const esIndicatorCopy: PartialDeep<Dictionary["indicatorCopy"]> = {
  vix: {
    description: "VIX muestra cuánto está pagando el mercado por la volatilidad esperada del S&P 500 en los próximos 30 días.",
    overview: "Un VIX más alto no dice que la bolsa vaya a caer mañana; dice que cubrirse a corto plazo cuesta más.",
    readHint: "Míralo junto con VXV, VXN/RVX y STLFSI4/NFCI. Si solo sube VIX, primero léelo como presión de acciones.",
    caveat: "Eventos, resultados, bancos centrales y poca liquidez pueden mover VIX por poco tiempo.",
  },
  "vix-term-proxy": {
    description: "Comparar VIX con VXV ayuda a ver si el riesgo de corto plazo está más caro que el de tres meses.",
    overview: "Cuando sube, el mercado paga más por protección inmediata.",
    readHint: "Si el ratio se acerca o supera 1, revisa primero los eventos próximos antes de juzgar solo el nivel de VIX.",
    caveat: "La curva cambia con calendario y liquidez. Mira varios días, no una sola lectura.",
  },
  vxn: {
    description: "VXN sigue la volatilidad esperada del Nasdaq 100 y ayuda a leer el riesgo en tecnología y crecimiento.",
    overview: "Si VXN sube, el mercado está cobrando más por riesgo en acciones de crecimiento.",
    readHint: "Si VXN sube antes que VIX, el estrés puede estar concentrado en tecnología. Si también suben VIX y RVX, importa la amplitud.",
    caveat: "La concentración del Nasdaq puede hacer que la señal salte con fuerza.",
  },
  rvx: {
    description: "RVX sigue la volatilidad esperada del Russell 2000 y es sensible al apetito por small caps.",
    overview: "Un RVX al alza suele señalar presión en compañías pequeñas y activos de mayor beta.",
    readHint: "Si RVX sube junto con VIX y VXN, el riesgo de acciones probablemente se está ampliando.",
    caveat: "Las small caps son ruidosas. Usa tendencia y cambios relativos.",
  },
  vxd: {
    description: "VXD añade una mirada a la volatilidad del Dow Jones, útil para sectores grandes y más tradicionales.",
    overview: "Ayuda a comprobar si el riesgo también se repricia fuera de tecnología.",
    readHint: "Compáralo con VIX, VXN y RVX para ubicar dónde se concentra el riesgo.",
    caveat: "El Dow tiene una composición particular; no lo trates como todo el mercado.",
  },
  stlfsi4: {
    description: "STLFSI4 es un indicador de estrés financiero de la Fed de St. Louis.",
    overview: "Cuando sube, conviene mirar presión del sistema, no solo volatilidad de acciones.",
    readHint: "Si STLFSI4 y NFCI suben mientras VIX también sube, la historia de contagio gana peso.",
    caveat: "Es semanal y más lento que VIX, pero una tendencia clara importa.",
  },
  nfci: {
    description: "NFCI sigue las condiciones financieras amplias de Estados Unidos desde la Fed de Chicago.",
    overview: "Un NFCI más alto sugiere condiciones financieras más apretadas.",
    readHint: "Si NFCI y STLFSI4 suben juntos, puedes pasar de leer volatilidad de acciones a presión del sistema.",
    caveat: "Es semanal. Úsalo para zona y tendencia, no para decisiones intradía.",
  },
  anfci: {
    description: "ANFCI ajusta NFCI para separar mejor las condiciones financieras del ciclo económico.",
    overview: "Ayuda a distinguir si la presión viene del sistema financiero o del entorno económico.",
    readHint: "Úsalo con NFCI y STLFSI4 como comprobación cruzada.",
    caveat: "Es una vista de apoyo, no una señal para concluir sola.",
  },
};

const deIndicatorCopy: PartialDeep<Dictionary["indicatorCopy"]> = {
  vix: {
    description: "VIX zeigt, wie teuer erwartete Schwankungen im S&P 500 für die nächsten 30 Tage sind.",
    overview: "Ein höherer VIX heißt nicht, dass Aktien morgen fallen müssen. Es heißt, kurzfristige Absicherung wird teurer.",
    readHint: "Lies ihn mit VXV, VXN/RVX und STLFSI4/NFCI. Wenn nur VIX steigt, ist es zuerst Aktienmarktstress.",
    caveat: "Ereignisse, Gewinne, Notenbanken und dünne Liquidität können VIX kurzfristig verzerren.",
  },
  "vix-term-proxy": {
    description: "VIX gegen VXV zeigt, ob kurzfristige Volatilität teurer wird als der Drei-Monats-Blick.",
    overview: "Wenn das steigt, zahlt der Markt mehr für Schutz vor nahen Ereignissen.",
    readHint: "Bei Werten nahe oder über 1 prüfe zuerst den Ereigniskalender, statt nur den VIX-Stand zu bewerten.",
    caveat: "Die Terminstruktur reagiert auf Kalender und Liquidität. Mehrere Tage sind besser als ein Punkt.",
  },
  vxn: {
    description: "VXN liest erwartete Volatilität im Nasdaq 100 und ist nützlich für Tech- und Wachstumsrisiko.",
    overview: "Ein steigender VXN zeigt oft, dass Tech- oder Wachstumsrisiko teurer wird.",
    readHint: "Wenn VXN vor VIX steigt, kann der Druck noch in Tech liegen. Steigen VIX und RVX mit, wird Breite wichtiger.",
    caveat: "Die Nasdaq-Konzentration kann die Bewegung sprunghaft machen.",
  },
  rvx: {
    description: "RVX liest erwartete Volatilität im Russell 2000 und reagiert stark auf Risikoappetit bei Small Caps.",
    overview: "Ein steigender RVX kann Druck in kleineren Unternehmen und riskanteren Aktienbereichen zeigen.",
    readHint: "Steigt RVX zusammen mit VIX und VXN, breitet sich Aktienrisiko eher aus.",
    caveat: "Small Caps sind laut. Lies Trend und relative Veränderung.",
  },
  vxd: {
    description: "VXD ergänzt den Blick auf Dow-Jones-Volatilität und klassische Großunternehmen.",
    overview: "Er zeigt, ob Risiko auch außerhalb von Tech neu bewertet wird.",
    readHint: "Vergleiche ihn mit VIX, VXN und RVX, um den Schwerpunkt des Aktienrisikos zu sehen.",
    caveat: "Der Dow ist speziell zusammengesetzt. Er steht nicht für den ganzen Markt.",
  },
  stlfsi4: {
    description: "STLFSI4 ist ein Finanzstress-Indikator der St. Louis Fed.",
    overview: "Wenn er steigt, wird Systemdruck wichtiger als reine Aktienvolatilität.",
    readHint: "Steigen STLFSI4 und NFCI zusammen mit VIX, ist die Ausbreitungsthese stärker.",
    caveat: "Der Wert ist wöchentlich und langsamer als VIX, aber ein klarer Trend zählt.",
  },
  nfci: {
    description: "NFCI misst breite US-Finanzbedingungen der Chicago Fed.",
    overview: "Ein höherer NFCI spricht für straffere Finanzbedingungen.",
    readHint: "Wenn NFCI und STLFSI4 gemeinsam steigen, lies es eher als Systemdruck als nur als Aktienvola.",
    caveat: "Das ist ein wöchentlicher Trendindikator, kein Intraday-Signal.",
  },
  anfci: {
    description: "ANFCI bereinigt NFCI, um Finanzbedingungen besser vom Konjunkturzyklus zu trennen.",
    overview: "Er hilft zu fragen, ob Druck aus dem Finanzsystem selbst kommt.",
    readHint: "Nutze ANFCI mit NFCI und STLFSI4 als Gegencheck.",
    caveat: "Es ist eine Zusatzsicht, keine alleinige Entscheidungsgrundlage.",
  },
};

const frIndicatorCopy: PartialDeep<Dictionary["indicatorCopy"]> = {
  vix: {
    description: "Le VIX mesure le prix payé par le marché pour la volatilité attendue du S&P 500 sur les 30 prochains jours.",
    overview: "Un VIX plus haut ne veut pas dire que les actions doivent chuter demain ; il dit que l’assurance de court terme coûte plus cher.",
    readHint: "Lis-le avec VXV, VXN/RVX et STLFSI4/NFCI. Si seul le VIX monte, commence par une lecture actions.",
    caveat: "Événements, résultats, banques centrales et faible liquidité peuvent déplacer le VIX brièvement.",
  },
  "vix-term-proxy": {
    description: "Comparer VIX et VXV montre si le risque à court terme devient plus cher que le risque à trois mois.",
    overview: "Quand il monte, le marché paie davantage pour se protéger maintenant.",
    readHint: "Si le ratio approche ou dépasse 1, regarde d’abord les événements proches avant de juger le niveau du VIX.",
    caveat: "La structure par terme dépend du calendrier et de la liquidité. Lis plusieurs jours.",
  },
  vxn: {
    description: "VXN suit la volatilité attendue du Nasdaq 100, utile pour le risque tech et croissance.",
    overview: "Un VXN qui monte indique souvent une prime de risque plus chère sur la tech.",
    readHint: "Si VXN monte avant VIX, le stress peut rester concentré sur la tech. Si VIX et RVX montent aussi, la largeur compte.",
    caveat: "La concentration du Nasdaq peut rendre le signal brusque.",
  },
  rvx: {
    description: "RVX suit la volatilité attendue du Russell 2000 et réagit au goût du risque sur les petites capitalisations.",
    overview: "Un RVX plus haut peut signaler de la pression dans les segments plus risqués des actions.",
    readHint: "Si RVX monte avec VIX et VXN, le risque actions s’élargit probablement.",
    caveat: "Les petites capitalisations sont bruyantes. Lis la tendance et les changements relatifs.",
  },
  vxd: {
    description: "VXD ajoute une lecture de la volatilité du Dow Jones, utile pour les grands secteurs traditionnels.",
    overview: "Il aide à voir si le risque se repricie aussi hors technologie.",
    readHint: "Compare-le à VIX, VXN et RVX pour situer le foyer du risque actions.",
    caveat: "Le Dow a une composition particulière ; ne le traite pas comme tout le marché.",
  },
  stlfsi4: {
    description: "STLFSI4 est une jauge de stress financier publiée par la Fed de St. Louis.",
    overview: "Quand il monte, regarde davantage la pression du système que la seule volatilité actions.",
    readHint: "Si STLFSI4 et NFCI montent pendant que VIX monte, le scénario de propagation devient plus crédible.",
    caveat: "C’est hebdomadaire et plus lent que VIX, mais une vraie tendance compte.",
  },
  nfci: {
    description: "NFCI suit les conditions financières larges aux États-Unis avec les données de la Fed de Chicago.",
    overview: "Un NFCI plus haut suggère des conditions financières plus tendues.",
    readHint: "Si NFCI et STLFSI4 montent ensemble, passe d’une lecture de volatilité actions à une lecture de pression système.",
    caveat: "C’est un signal hebdomadaire, utile pour la zone et la tendance, pas pour l’intraday.",
  },
  anfci: {
    description: "ANFCI ajuste NFCI pour mieux isoler les conditions financières du cycle économique.",
    overview: "Il aide à voir si la pression vient de la finance elle-même ou du contexte économique.",
    readHint: "Lis ANFCI avec NFCI et STLFSI4 comme recoupement.",
    caveat: "C’est une vue d’appui, pas un signal autonome.",
  },
};

const ptBRIndicatorCopy: PartialDeep<Dictionary["indicatorCopy"]> = {
  vix: {
    description: "O VIX mostra quanto o mercado paga pela volatilidade esperada do S&P 500 nos próximos 30 dias.",
    overview: "VIX mais alto não quer dizer queda amanhã; quer dizer que proteção de curto prazo ficou mais cara.",
    readHint: "Leia junto com VXV, VXN/RVX e STLFSI4/NFCI. Se só o VIX sobe, trate primeiro como pressão em ações.",
    caveat: "Eventos, balanços, bancos centrais e pouca liquidez podem mexer no VIX por pouco tempo.",
  },
  "vix-term-proxy": {
    description: "Comparar VIX com VXV mostra se o risco de curto prazo está mais caro que o risco de três meses.",
    overview: "Quando sobe, o mercado está pagando mais por proteção imediata.",
    readHint: "Se o ratio chega perto ou passa de 1, olhe os eventos próximos antes de julgar só o nível do VIX.",
    caveat: "A curva muda com calendário e liquidez. Use alguns dias, não um ponto isolado.",
  },
  vxn: {
    description: "VXN acompanha a volatilidade esperada do Nasdaq 100 e ajuda a ler risco em tecnologia e crescimento.",
    overview: "VXN subindo costuma indicar prêmio de risco mais caro em tech e crescimento.",
    readHint: "Se VXN sobe antes de VIX, o estresse pode estar em tecnologia. Se VIX e RVX também sobem, a leitura fica mais ampla.",
    caveat: "A concentração do Nasdaq pode deixar o sinal mais brusco.",
  },
  rvx: {
    description: "RVX acompanha a volatilidade esperada do Russell 2000 e reage ao apetite por small caps.",
    overview: "RVX subindo pode mostrar pressão em empresas menores e áreas mais arriscadas das ações.",
    readHint: "Se RVX sobe junto com VIX e VXN, o risco em ações provavelmente está se espalhando.",
    caveat: "Small caps são ruidosas. Leia tendência e mudanças relativas.",
  },
  vxd: {
    description: "VXD adiciona uma visão da volatilidade do Dow Jones, útil para setores grandes e tradicionais.",
    overview: "Ajuda a checar se o risco também está sendo reprificado fora de tecnologia.",
    readHint: "Compare com VIX, VXN e RVX para entender onde o risco em ações está concentrado.",
    caveat: "O Dow tem composição própria, então não representa todo o mercado sozinho.",
  },
  stlfsi4: {
    description: "STLFSI4 é um indicador de estresse financeiro da Fed de St. Louis.",
    overview: "Quando sobe, vale olhar pressão sistêmica, não apenas volatilidade de ações.",
    readHint: "Se STLFSI4 e NFCI sobem enquanto VIX sobe, a leitura de risco se espalhando fica mais forte.",
    caveat: "É semanal e mais lento que VIX, mas uma tendência clara importa.",
  },
  nfci: {
    description: "NFCI acompanha condições financeiras amplas dos EUA pela Fed de Chicago.",
    overview: "NFCI mais alto sugere condições financeiras mais apertadas.",
    readHint: "Se NFCI e STLFSI4 sobem juntos, a leitura sai de volatilidade de ações e entra em pressão sistêmica.",
    caveat: "É semanal. Use para tendência e zona, não para decisão intradiária.",
  },
  anfci: {
    description: "ANFCI ajusta o NFCI para separar melhor condições financeiras do ciclo econômico.",
    overview: "Ajuda a perguntar se a pressão vem do sistema financeiro ou do pano de fundo econômico.",
    readHint: "Leia ANFCI junto com NFCI e STLFSI4 como conferência.",
    caveat: "É uma visão de apoio, não um sinal isolado.",
  },
};

const jaIndicatorCopy: PartialDeep<Dictionary["indicatorCopy"]> = {
  vix: {
    description: "VIX は、今後30日間の S&P 500 の変動に対して市場がどれだけ保険料を払っているかを示します。",
    overview: "VIX が高いことは、明日必ず株が下がるという意味ではありません。短期の不確実性が高く評価されているという意味です。",
    readHint: "VXV、VXN/RVX、STLFSI4/NFCI と一緒に見ます。VIX だけが上がるなら、まず株式市場内の圧力として読みます。",
    caveat: "イベント、決算、金融政策、流動性の薄さで短期的に大きく動くことがあります。",
  },
  "vix-term-proxy": {
    description: "VIX と VXV を比べると、短期リスクが3か月先のリスクより高く買われているかが分かります。",
    overview: "上昇すると、市場が目先の保護により多く払っている状態です。",
    readHint: "比率が1に近づく、または上回る時は、VIX の水準だけでなく直近イベントを確認します。",
    caveat: "期間構造はカレンダーと流動性に影響されます。1点ではなく数日で見ます。",
  },
  vxn: {
    description: "VXN は Nasdaq 100 の予想変動率で、テックや成長株のリスクを見るのに役立ちます。",
    overview: "VXN が上がると、テックや成長株のリスクプレミアムが高くなっている可能性があります。",
    readHint: "VXN だけが先に上がるなら、圧力はまだテック中心かもしれません。VIX と RVX も上がるなら広がりを重視します。",
    caveat: "Nasdaq は銘柄集中が強く、短期的に振れやすい指標です。",
  },
  rvx: {
    description: "RVX は Russell 2000 の予想変動率で、小型株へのリスク許容度に敏感です。",
    overview: "RVX の上昇は、小型株や高ベータ領域への圧力を示すことがあります。",
    readHint: "RVX が VIX と VXN と一緒に上がるなら、株式リスクは広がっている可能性があります。",
    caveat: "小型株はノイズが多いので、方向と相対的な変化で見ます。",
  },
  vxd: {
    description: "VXD は Dow Jones の予想変動率で、伝統的な大型株セクターを見る補助になります。",
    overview: "テック以外の大型株でもリスクが再評価されているかを確認できます。",
    readHint: "VIX、VXN、RVX と比べて、株式リスクがどこに集中しているかを見ます。",
    caveat: "Dow の構成は特殊なので、市場全体の代表として単独で扱わないでください。",
  },
  stlfsi4: {
    description: "STLFSI4 は St. Louis Fed が出す金融ストレス指標です。",
    overview: "上昇した時は、株式ボラだけでなく金融システム側の圧力を見ます。",
    readHint: "STLFSI4 と NFCI が VIX と同時に上がると、リスクが広がる読みは強くなります。",
    caveat: "週次で VIX より遅いですが、はっきりしたトレンドは重要です。",
  },
  nfci: {
    description: "NFCI は Chicago Fed の広い米国金融環境指標です。",
    overview: "NFCI が高いほど、金融環境が引き締まっている可能性があります。",
    readHint: "NFCI と STLFSI4 が一緒に上がるなら、株式ボラではなくシステム圧力として読みます。",
    caveat: "週次指標なので、日中判断ではなくゾーンとトレンドを見るために使います。",
  },
  anfci: {
    description: "ANFCI は NFCI を調整し、景気循環の影響を少し切り分けた見方です。",
    overview: "圧力が金融条件そのものから来ているのか、景気背景から来ているのかを見やすくします。",
    readHint: "NFCI と STLFSI4 と並べて、システム圧力の確認に使います。",
    caveat: "補助的な見方であり、単独で結論を出す指標ではありません。",
  },
};

const esArticleCopy: PartialDeep<Dictionary["articleCopy"]> = {
  "what-is-vix": {
    title: "Qué mide realmente el VIX",
    description: "VIX no es solo un índice de miedo. Es el precio que paga el mercado por la volatilidad de los próximos 30 días.",
    summary: "Una guía simple para entender cuándo VIX ayuda y cuándo puede engañar.",
    sections: [
      { title: "En resumen", body: ["VIX refleja cuánto está dispuesto a pagar el mercado de opciones por la incertidumbre cercana. Un VIX alto no significa que la bolsa tenga que caer mañana; significa que el seguro está más caro."] },
      { title: "Cómo lo uso", body: ["Me importa más el cambio de estado que un nivel aislado. Si VIX salta pero STLFSI4 y NFCI siguen tranquilos, lo leo primero como repricing de riesgo en acciones."] },
      { title: "Nota de datos", body: ["Esta nota usa las fuentes públicas del panel y sirve solo para observar el mercado."] },
    ],
  },
  "why-not-just-vix": {
    title: "Por qué VIX no basta",
    description: "VIX es un buen inicio, pero un solo número puede convertir ruido de evento en una falsa historia de riesgo sistémico.",
    summary: "Una secuencia simple para no reaccionar de más a un salto de VIX.",
    sections: [
      { title: "En resumen", body: ["VIX solo dice cuánto cuesta la volatilidad esperada del S&P 500 a corto plazo. No dice de dónde viene el riesgo ni si crédito y liquidez lo confirman."] },
      { title: "Secuencia práctica", body: [], bullets: ["Mira dirección y persistencia de VIX.", "Compáralo con VXV.", "Confirma con STLFSI4 y NFCI."] },
    ],
  },
  "vix-vs-vix3m": {
    title: "VIX y volatilidad a 3 meses",
    description: "La relación entre corto y medio plazo ayuda a separar un susto de una repricing más duradero.",
    summary: "Por qué la volatilidad cercana puede volverse de repente más cara.",
    sections: [
      { title: "En resumen", body: ["VIX mira el corto plazo; VXV/VIX3M mira más adelante. Juntos muestran si el mercado paga por un evento inmediato o por una ventana de riesgo más larga."] },
      { title: "Regla útil", body: ["Si la curva rara dura uno o dos días, obsérvala. Si persiste y el estrés del sistema también sube, tómala más en serio."] },
    ],
  },
  "vix-vxn-rvx-differences": {
    title: "VIX, VXN y RVX: qué mira cada uno",
    description: "Todos miran volatilidad de acciones, pero no miran la misma parte del mercado.",
    summary: "Úsalos para saber si el riesgo viene de tecnología, small caps o del mercado amplio.",
    sections: [
      { title: "En resumen", body: ["VIX mira acciones grandes de forma amplia, VXN es más sensible a tecnología y crecimiento, y RVX a small caps."] },
      { title: "Cómo leerlos", body: [], bullets: ["VXN lidera: tecnología puede ser el punto de presión.", "RVX lidera: small caps y apetito por riesgo importan.", "Suben todos: el riesgo de acciones se está extendiendo."] },
    ],
  },
  "stlfsi-vs-nfci": {
    title: "STLFSI4 y NFCI: dos vistas de presión financiera",
    description: "Estas series oficiales ayudan a ver si el riesgo ya salió de la volatilidad de acciones.",
    summary: "Sirven para separar un temblor bursátil de un endurecimiento financiero más amplio.",
    sections: [
      { title: "En resumen", body: ["VIX dice si las opciones de acciones están tensas. STLFSI4 y NFCI ayudan a comprobar si las condiciones financieras acompañan el movimiento."] },
      { title: "Cómo leerlos", body: [], bullets: ["STLFSI4 sube y NFCI plano: vigila liquidez.", "NFCI sube y STLFSI4 plano: las condiciones pueden estar apretándose.", "Ambos suben: la presión del sistema merece más atención."] },
    ],
  },
  "how-to-read-market-risk-dashboard": {
    title: "Cómo leer StressSignal",
    description: "Una secuencia práctica desde volatilidad de acciones hasta presión financiera.",
    summary: "Qué mirar primero, segundo y solo después decidir si preocuparse más.",
    sections: [
      { title: "En resumen", body: ["Usa el panel como orden de lectura, no como máquina de predicción. Empieza por volatilidad de acciones, luego curva, luego presión del sistema."] },
      { title: "Regla útil", body: ["Sube la lectura de riesgo solo cuando al menos dos capas se alejan de lo normal al mismo tiempo."] },
    ],
  },
};

const deArticleCopy: PartialDeep<Dictionary["articleCopy"]> = {
  "what-is-vix": {
    title: "Was VIX wirklich misst",
    description: "VIX ist nicht nur ein Angstindex. Er zeigt den Preis für erwartete Schwankungen in den nächsten 30 Tagen.",
    summary: "Eine einfache Erklärung, wann VIX hilft und wann er täuschen kann.",
    sections: [
      { title: "Kurz gesagt", body: ["VIX zeigt, was Optionsmärkte für nahe Unsicherheit zahlen. Ein hoher VIX heißt nicht, dass Aktien morgen fallen müssen; Absicherung ist nur teurer."] },
      { title: "So nutze ich ihn", body: ["Mich interessiert der Zustandswechsel mehr als ein einzelner Stand. Springt VIX, während STLFSI4 und NFCI ruhig bleiben, lese ich zuerst Aktienrisiko."] },
      { title: "Datenhinweis", body: ["Diese Notiz nutzt die öffentlichen Quellen des Dashboards und dient nur der Marktbeobachtung."] },
    ],
  },
  "why-not-just-vix": {
    title: "Warum VIX allein nicht reicht",
    description: "VIX ist ein guter Start, aber eine Zahl kann Ereignisrauschen schnell wie Systemstress wirken lassen.",
    summary: "Eine einfache Reihenfolge gegen Überreaktionen auf einen VIX-Sprung.",
    sections: [
      { title: "Kurz gesagt", body: ["VIX sagt nur, wie teuer kurzfristige S&P-500-Volatilität ist. Er sagt nicht, woher Risiko kommt oder ob Kredit und Liquidität mitziehen."] },
      { title: "Praktische Reihenfolge", body: [], bullets: ["Richtung und Dauer von VIX prüfen.", "VIX mit VXV vergleichen.", "Mit STLFSI4 und NFCI bestätigen."] },
    ],
  },
  "vix-vs-vix3m": {
    title: "VIX und Drei-Monats-Volatilität",
    description: "Die Beziehung von kurz zu mittel hilft, einen Schreck von dauerhafter Neubewertung zu trennen.",
    summary: "Warum nahe Volatilität plötzlich teurer werden kann.",
    sections: [
      { title: "Kurz gesagt", body: ["VIX blickt kurzfristig, VXV/VIX3M weiter hinaus. Gemeinsam zeigen sie, ob der Markt ein nahes Ereignis oder ein längeres Risikofenster bezahlt."] },
      { title: "Faustregel", body: ["Dauert eine ungewöhnliche Struktur nur ein oder zwei Tage, beobachte sie. Hält sie an und Systemstress steigt, nimm sie ernster."] },
    ],
  },
  "vix-vxn-rvx-differences": {
    title: "VIX, VXN und RVX: was jeder sieht",
    description: "Alle sind Volatilitätsmaße für Aktien, aber sie schauen auf verschiedene Marktbereiche.",
    summary: "Nutze sie, um Tech-Druck, Small-Cap-Druck oder breites Aktienrisiko zu erkennen.",
    sections: [
      { title: "Kurz gesagt", body: ["VIX liest breite Large Caps, VXN ist stärker Tech- und Wachstums-orientiert, RVX reagiert mehr auf Small Caps."] },
      { title: "So liest man sie", body: [], bullets: ["VXN führt: Tech kann der Druckpunkt sein.", "RVX führt: Small Caps und Risikoappetit zählen.", "Alle steigen: Aktienrisiko breitet sich aus."] },
    ],
  },
  "stlfsi-vs-nfci": {
    title: "STLFSI4 und NFCI: zwei Sichten auf Finanzdruck",
    description: "Diese offiziellen Reihen zeigen, ob Risiko über Aktienvolatilität hinausgeht.",
    summary: "Damit lässt sich ein Aktienwackler von breiterer Straffung unterscheiden.",
    sections: [
      { title: "Kurz gesagt", body: ["VIX zeigt Spannung in Aktienoptionen. STLFSI4 und NFCI prüfen, ob Finanzbedingungen und Stress mitziehen."] },
      { title: "So liest man sie", body: [], bullets: ["STLFSI4 hoch, NFCI flach: Liquiditätsdruck beobachten.", "NFCI hoch, STLFSI4 flach: Bedingungen werden vielleicht straffer.", "Beide hoch: Systemdruck verdient mehr Aufmerksamkeit."] },
    ],
  },
  "how-to-read-market-risk-dashboard": {
    title: "So liest du StressSignal",
    description: "Eine praktische Reihenfolge von Aktienvolatilität über Kurve bis Finanzdruck.",
    summary: "Was zuerst und danach kommt, bevor man das Risiko hochstuft.",
    sections: [
      { title: "Kurz gesagt", body: ["Nutze das Dashboard als Lesereihenfolge, nicht als Prognosemaschine. Erst Aktienvola, dann Terminstruktur, dann Systemdruck."] },
      { title: "Nützliche Regel", body: ["Stufe Risiko erst hoch, wenn mindestens zwei Ebenen gleichzeitig von normal abweichen."] },
    ],
  },
};

const frArticleCopy: PartialDeep<Dictionary["articleCopy"]> = {
  "what-is-vix": {
    title: "Ce que mesure vraiment le VIX",
    description: "Le VIX n’est pas seulement un indice de peur. C’est le prix payé pour la volatilité des 30 prochains jours.",
    summary: "Une explication simple de ce que le VIX dit bien, et de ce qu’il ne dit pas.",
    sections: [
      { title: "À retenir", body: ["Le VIX reflète ce que le marché des options paie pour l’incertitude proche. Un VIX haut ne veut pas dire que les actions doivent chuter demain ; l’assurance coûte plus cher."] },
      { title: "Comment je l’utilise", body: ["Je regarde surtout le changement d’état. Si le VIX saute mais que STLFSI4 et NFCI restent calmes, je lis d’abord une repricing du risque actions."] },
      { title: "Note de données", body: ["Cette note utilise les sources publiques du tableau et sert uniquement à observer le marché."] },
    ],
  },
  "why-not-just-vix": {
    title: "Pourquoi le VIX ne suffit pas",
    description: "Le VIX est un bon départ, mais un seul chiffre peut transformer du bruit d’événement en faux risque système.",
    summary: "Une séquence simple pour éviter de sur-réagir à un pic du VIX.",
    sections: [
      { title: "À retenir", body: ["Le VIX indique seulement le prix de la volatilité attendue à court terme du S&P 500. Il ne dit pas d’où vient le risque ni si crédit et liquidité confirment."] },
      { title: "Séquence pratique", body: [], bullets: ["Regarder la direction et la persistance du VIX.", "Comparer VIX avec VXV.", "Confirmer avec STLFSI4 et NFCI."] },
    ],
  },
  "vix-vs-vix3m": {
    title: "VIX et volatilité à 3 mois",
    description: "Le rapport court terme / moyen terme aide à distinguer une peur passagère d’une repricing plus durable.",
    summary: "Pourquoi la volatilité proche peut devenir soudainement plus chère.",
    sections: [
      { title: "À retenir", body: ["VIX regarde le court terme ; VXV/VIX3M regarde plus loin. Ensemble, ils montrent si le marché paie pour un événement immédiat ou une fenêtre de risque plus longue."] },
      { title: "Règle simple", body: ["Si l’anomalie dure un ou deux jours, observe. Si elle persiste et que le stress système monte aussi, prends-la plus au sérieux."] },
    ],
  },
  "vix-vxn-rvx-differences": {
    title: "VIX, VXN et RVX : ce que chacun voit",
    description: "Ce sont tous des jauges de volatilité actions, mais elles ne regardent pas la même partie du marché.",
    summary: "Utilise-les pour voir si le risque vient de la tech, des small caps ou du marché large.",
    sections: [
      { title: "À retenir", body: ["VIX regarde les grandes actions au sens large, VXN est plus sensible à la tech et à la croissance, RVX aux petites capitalisations."] },
      { title: "Comment les lire", body: [], bullets: ["VXN mène : la tech peut être le point de pression.", "RVX mène : small caps et goût du risque comptent.", "Tout monte : le risque actions se propage."] },
    ],
  },
  "stlfsi-vs-nfci": {
    title: "STLFSI4 et NFCI : deux vues de la pression financière",
    description: "Ces séries officielles aident à voir si le risque dépasse la volatilité actions.",
    summary: "Elles séparent une secousse boursière d’un durcissement financier plus large.",
    sections: [
      { title: "À retenir", body: ["Le VIX dit si les options actions sont tendues. STLFSI4 et NFCI vérifient si les conditions financières accompagnent le mouvement."] },
      { title: "Comment les lire", body: [], bullets: ["STLFSI4 monte, NFCI plat : surveiller la liquidité.", "NFCI monte, STLFSI4 plat : conditions peut-être plus serrées.", "Les deux montent : la pression système mérite plus d’attention."] },
    ],
  },
  "how-to-read-market-risk-dashboard": {
    title: "Comment lire StressSignal",
    description: "Une séquence pratique depuis la volatilité actions jusqu’à la pression financière.",
    summary: "Quoi vérifier d’abord, ensuite, puis seulement décider s’il faut s’inquiéter davantage.",
    sections: [
      { title: "À retenir", body: ["Utilise le tableau comme un ordre de lecture, pas comme une machine de prédiction. D’abord la volatilité actions, puis la structure par terme, puis la pression système."] },
      { title: "Règle utile", body: ["Ne relève la lecture du risque que si au moins deux couches s’éloignent de la normale ensemble."] },
    ],
  },
};

const ptBRArticleCopy: PartialDeep<Dictionary["articleCopy"]> = {
  "what-is-vix": {
    title: "O que o VIX realmente mede",
    description: "VIX não é só um índice de medo. É o preço que o mercado paga pela volatilidade dos próximos 30 dias.",
    summary: "Uma explicação simples de quando o VIX ajuda e quando pode enganar.",
    sections: [
      { title: "Resumo", body: ["O VIX mostra quanto o mercado de opções paga pela incerteza de curto prazo. VIX alto não quer dizer queda amanhã; quer dizer que o seguro ficou mais caro."] },
      { title: "Como eu uso", body: ["Eu olho mais a mudança de estado do que um nível isolado. Se VIX salta e STLFSI4/NFCI ficam calmos, leio primeiro como reprificação de risco em ações."] },
      { title: "Nota de dados", body: ["Esta nota usa as fontes públicas do painel e serve apenas para observação de mercado."] },
    ],
  },
  "why-not-just-vix": {
    title: "Por que VIX não basta",
    description: "VIX é um bom começo, mas um número só pode transformar ruído de evento em falsa história de risco sistêmico.",
    summary: "Uma sequência simples para evitar reação exagerada a um salto do VIX.",
    sections: [
      { title: "Resumo", body: ["VIX só mostra quanto custa a volatilidade esperada de curto prazo do S&P 500. Ele não mostra de onde vem o risco nem se crédito e liquidez confirmam."] },
      { title: "Sequência prática", body: [], bullets: ["Ver direção e persistência do VIX.", "Comparar VIX com VXV.", "Confirmar com STLFSI4 e NFCI."] },
    ],
  },
  "vix-vs-vix3m": {
    title: "VIX e volatilidade de 3 meses",
    description: "A relação entre curto e médio prazo ajuda a separar susto de reprificação mais durável.",
    summary: "Por que a volatilidade de curto prazo pode ficar cara de repente.",
    sections: [
      { title: "Resumo", body: ["VIX olha o curto prazo; VXV/VIX3M olha mais adiante. Juntos mostram se o mercado paga por um evento imediato ou por uma janela de risco mais longa."] },
      { title: "Regra útil", body: ["Se a estrutura estranha dura um ou dois dias, observe. Se persiste e o estresse sistêmico também sobe, leve mais a sério."] },
    ],
  },
  "vix-vxn-rvx-differences": {
    title: "VIX, VXN e RVX: o que cada um enxerga",
    description: "Todos olham volatilidade de ações, mas cada um cobre um pedaço diferente do mercado.",
    summary: "Use para ver se o risco está em tecnologia, small caps ou no mercado amplo.",
    sections: [
      { title: "Resumo", body: ["VIX olha ações grandes de forma ampla, VXN é mais sensível a tecnologia e crescimento, e RVX a small caps."] },
      { title: "Como ler", body: [], bullets: ["VXN lidera: tecnologia pode ser o ponto de pressão.", "RVX lidera: small caps e apetite por risco importam.", "Todos sobem: risco em ações está se espalhando."] },
    ],
  },
  "stlfsi-vs-nfci": {
    title: "STLFSI4 e NFCI: duas visões da pressão financeira",
    description: "Essas séries oficiais ajudam a ver se o risco passou da volatilidade de ações.",
    summary: "Use para separar uma oscilação da bolsa de aperto financeiro mais amplo.",
    sections: [
      { title: "Resumo", body: ["VIX mostra se opções de ações estão tensas. STLFSI4 e NFCI ajudam a checar se condições financeiras estão acompanhando o movimento."] },
      { title: "Como ler", body: [], bullets: ["STLFSI4 sobe, NFCI estável: observe liquidez.", "NFCI sobe, STLFSI4 estável: condições podem estar apertando.", "Ambos sobem: pressão sistêmica merece mais atenção."] },
    ],
  },
  "how-to-read-market-risk-dashboard": {
    title: "Como ler o StressSignal",
    description: "Uma sequência prática de volatilidade de ações até pressão financeira.",
    summary: "O que checar primeiro, depois, e só então decidir se a preocupação aumenta.",
    sections: [
      { title: "Resumo", body: ["Use o painel como ordem de leitura, não como máquina de previsão. Comece por volatilidade de ações, depois curva, depois pressão sistêmica."] },
      { title: "Regra útil", body: ["Só aumente a leitura de risco quando pelo menos duas camadas saem do normal ao mesmo tempo."] },
    ],
  },
};

const jaArticleCopy: PartialDeep<Dictionary["articleCopy"]> = {
  "what-is-vix": {
    title: "VIX が本当に測っているもの",
    description: "VIX は単なる恐怖指数ではありません。今後30日間の変動に市場が払う価格です。",
    summary: "VIX が役に立つ場面と、誤解しやすい場面をやさしく整理します。",
    sections: [
      { title: "要点", body: ["VIX は、近い将来の不確実性に対してオプション市場がどれだけ払うかを示します。高い VIX は明日の株安を意味せず、保険料が高いという意味です。"] },
      { title: "どう使うか", body: ["私は水準そのものより、状態の変化を見ます。VIX だけが跳ねて STLFSI4 と NFCI が落ち着いているなら、まず株式リスクの再評価として読みます。"] },
      { title: "データ注記", body: ["このノートはダッシュボードの公開データを使い、市場観察のみを目的とします。"] },
    ],
  },
  "why-not-just-vix": {
    title: "VIX だけでは足りない理由",
    description: "VIX は良い出発点ですが、1つの数字だけではイベントのノイズをシステムリスクと誤読しやすくなります。",
    summary: "VIX の急上昇に反応しすぎないための簡単な順番です。",
    sections: [
      { title: "要点", body: ["VIX が示すのは、S&P 500 の短期変動がどれだけ高く買われているかだけです。リスクの出どころや信用・流動性の確認までは分かりません。"] },
      { title: "実用的な順番", body: [], bullets: ["VIX の方向と持続性を見る。", "VIX と VXV を比べる。", "STLFSI4 と NFCI で確認する。"] },
    ],
  },
  "vix-vs-vix3m": {
    title: "VIX と3か月ボラティリティ",
    description: "短期と中期の関係を見ると、一時的な不安と長めの再評価を分けやすくなります。",
    summary: "なぜ短期ボラティリティが急に高くなるのかを読みます。",
    sections: [
      { title: "要点", body: ["VIX は短期、VXV/VIX3M は少し先を見ます。並べると、市場が目先のイベントに払っているのか、長めのリスク期間に払っているのかが分かります。"] },
      { title: "目安", body: ["異常な期間構造が1、2日だけなら観察します。続いてシステムストレスも上がるなら、より重く見ます。"] },
    ],
  },
  "vix-vxn-rvx-differences": {
    title: "VIX、VXN、RVX：それぞれが見ている場所",
    description: "どれも株式ボラの指標ですが、見ている市場の部分が違います。",
    summary: "リスクがテック、小型株、広い株式市場のどこにあるかを見るために使います。",
    sections: [
      { title: "要点", body: ["VIX は大型株全体、VXN はテックや成長株、RVX は小型株により敏感です。"] },
      { title: "読み方", body: [], bullets: ["VXN が先行：テックが圧力点かもしれません。", "RVX が先行：小型株とリスク許容度を見ます。", "全部上昇：株式リスクは広がっています。"] },
    ],
  },
  "stlfsi-vs-nfci": {
    title: "STLFSI4 と NFCI：金融圧力の2つの見方",
    description: "この公式系列は、リスクが株式ボラを超えて広がったかを確認する助けになります。",
    summary: "株式市場の揺れと、より広い金融環境の引き締まりを分けて見ます。",
    sections: [
      { title: "要点", body: ["VIX は株式オプションの緊張を見ます。STLFSI4 と NFCI は、金融環境やストレスがそれに続いているかを確認します。"] },
      { title: "読み方", body: [], bullets: ["STLFSI4 上昇、NFCI 横ばい：流動性に注意。", "NFCI 上昇、STLFSI4 横ばい：金融環境が締まり始めた可能性。", "両方上昇：システム圧力をより重く見ます。"] },
    ],
  },
  "how-to-read-market-risk-dashboard": {
    title: "StressSignal の読み方",
    description: "株式ボラ、期間構造、金融圧力へ進む実用的な順番です。",
    summary: "まず何を見て、次に何を見て、いつ警戒を上げるかを整理します。",
    sections: [
      { title: "要点", body: ["このダッシュボードは予測機械ではなく、読む順番です。株式ボラ、期間構造、システム圧力の順に確認します。"] },
      { title: "使いやすいルール", body: ["少なくとも2つの層が同時に通常から外れた時だけ、リスク読みを一段上げます。"] },
    ],
  },
};

export const localizedDeepTranslations = {
  es: {
    states: { calm: "Calma", watch: "Vigilar", warming: "Subiendo", pressure: "Bajo presión", resonance: "Riesgo extendiéndose", insufficient: "Datos insuficientes", waiting: "Esperando datos" },
    policy: { publicOk: "Visible públicamente", reviewRequired: "Requiere revisión", licensedOnly: "Restringido", unknown: "Política desconocida", publicSentence: "Se usa en páginas públicas.", restrictedSentence: "Necesita revisión de licencia antes de mostrarse.", noSources: "Sin fuentes todavía", sourcePath: "Política de visualización" },
    license: { publicFred: "Serie pública. Mantenemos enlace de fuente y fecha de actualización.", primaryLeg: "Serie principal para la vista VIX/VXV, desde una fuente pública de FRED.", secondaryLeg: "Serie de apoyo para la vista VIX/VXV, desde una fuente pública de FRED." },
    metadata: { publicSources: "Fuentes públicas", frequency: "Frecuencia", updated: "Actualizado" },
    home: {
      fallbackState: "Esperando datos",
      fallbackHeadline: "La sincronización no terminó. Lee primero los impulsores.",
      waitingData: "Esperando datos",
      snapshotPending: "Se muestra cuando llegue la muestra",
      percentileSuffix: "percentil",
      asOfPrefix: "Fecha de datos",
      chartTermTitle: "VIX / VXV: corto contra 3 meses",
      chartTermSubtitle: "Vista diaria de volatilidad cercana y media",
      chartEquityTitle: "VIX / VXN / RVX / VXD",
      chartEquitySubtitle: "Comparación diaria entre volatilidades de acciones",
      chartStressTitle: "STLFSI4 y NFCI",
      chartStressSubtitle: "Vista semanal de presión del sistema",
      chartCompositeTitle: "Puntuación compuesta de riesgo",
      chartCompositeSubtitle: "Aparece cuando hay historial suficiente; mientras tanto mira los impulsores.",
      dataTitle: "Fuentes y política de visualización",
      dataSourcesCta: "Ver fuentes de datos",
      indicatorsCta: "Indicadores",
    },
    riskCard: { asOf: "Fecha de datos" },
    indicatorCard: { latest: "Último", percentile: "Percentil 1A", updated: "Actualizado", source: "Fuente", waitingSource: "Pendiente", sampleShort: "Pocos datos" },
    commentary: {
      missingSentence: "Estas series están incompletas: {missing}. La lectura mejora cuando se completen.",
      branches: {
        equity_only_warming: { title: "Las acciones se calientan, el sistema aún no confirma", body: "La volatilidad de acciones se repricia, pero STLFSI4 y NFCI no están altos. Por ahora parece presión local en acciones." },
        broad_equity_warming: { title: "El estrés de acciones se amplía", body: "VIX, VXN y RVX están elevados, así que el movimiento no queda en un solo rincón del mercado." },
        system_pressure_warming: { title: "La presión del sistema también sube", body: "STLFSI4 y NFCI avanzan juntos. La lectura de riesgo de cola gana credibilidad." },
        term_structure_inversion: { title: "La volatilidad de corto plazo se encarece", body: "El corto plazo sube frente a la vista de 3 meses, señal de más demanda por protección inmediata." },
      },
    },
    indicatorsPage: {
      metaDescription: "Consulta indicadores de riesgo por lectura reciente, cambio y percentil de 1 año.",
      empty: "Aún no hay instantáneas de indicadores. Actualiza cuando termine la sincronización.",
      table: { indicator: "Indicador", latest: "Último", changes: "1D / 5D / 20D", percentile: "Percentil 1A", state: "Estado", frequency: "Frecuencia", sourceUpdated: "Fuente / actualización", policy: "Política" },
      helpNote: "La guía y la página de fuentes explican el método y los límites de datos.",
    },
    indicatorDetail: {
      metaSuffix: "Indicador",
      missingDescription: "Este indicador no está disponible ahora.",
      percentile: "Percentil 1A",
      datasetDescription: "Conjunto de datos del indicador.",
      definitionFallback: "La definición todavía no está lista.",
      overviewFallback: "Este indicador ayuda a leer estrés de mercado y apetito por riesgo.",
      readHintFallback: "Léelo con indicadores relacionados, no solo.",
      caveatFallback: "Eventos puntuales pueden distorsionar la señal. Usa tendencia y frecuencia.",
      noHistory: "No hay historial en este rango. Prueba otro rango o espera la próxima sincronización.",
      historySuffix: "historial",
      tips: ["Mira primero la dirección; luego percentil y tamaño del movimiento.", "Si otros indicadores de volatilidad o estrés suben juntos, presta más atención.", "Usa las notas para no convertir un indicador en toda la conclusión."],
      relatedJump: "Indicadores relacionados",
      methodEntry: "Guía de método: ",
      methodLink: "cómo leer esta señal",
      unconfiguredSource: "Sin fuente configurada",
    },
    indicatorDefinition: { updated: "Indicador actualizado", frequency: "Frecuencia", overview: "Qué significa", howToRead: "Cómo leerlo", misread: "Error común", related: "Leer con", articles: "Notas relacionadas", sources: "Fuentes y derechos" },
    howToRead: {
      metaTitle: "Cómo leer",
      metaDescription: "Una guía simple para leer StressSignal sin depender de un solo indicador.",
      title: "Cómo leer el panel de riesgo",
      subtitle: "No fuerces una conclusión con un número. Lee tendencia, confirmación y límites juntos.",
      sections: [
        { title: "No mires solo VIX", body: ["VIX ayuda, pero no es un medidor de crisis. Para saber si el riesgo se extiende necesitas otras capas."] },
        { title: "Lee la capa de acciones", body: [], bullets: ["Comprueba si VIX, VXN y RVX van en la misma dirección.", "Usa VIX/VXV para ver si el corto plazo se encarece.", "Prioriza persistencia, no un salto de un día."] },
        { title: "Lee la capa del sistema", body: [], bullets: ["STLFSI4 y NFCI muestran si crédito y liquidez acompañan.", "Si VIX sube y ellos no, puede seguir siendo local.", "Si ambas capas suben, la lectura es más fuerte."] },
        { title: "Qué cuenta como contagio", body: ["Riesgo extendiéndose significa varias señales elevadas y moviéndose juntas. Una lectura alta avisa; varias capas altas merecen más atención."] },
      ],
      nextTitle: "Siguiente paso",
      vixCta: "Abrir VIX",
      stlfsiCta: "Abrir STLFSI4",
      dataCta: "Ver fuentes",
    },
    dataSources: {
      metaDescription: "Fuentes públicas, frecuencia de actualización y reglas de visualización de los indicadores.",
      table: { indicator: "Indicador", sourceCode: "Código", institution: "Institución", retrieval: "Método", frequency: "Frecuencia", updated: "Actualizado", policy: "Política", notes: "Uso" },
      retrieval: { fredApi: "API de FRED", csv: "CSV", publicEndpoint: "Endpoint público", manual: "Manual", licensed: "API con licencia" },
      riskOk: "Sin riesgo especial",
      riskReview: "Requiere revisión",
      riskPublic: "Apto para mostrar",
      defaultNote: "Basado en una fuente pública.",
      configNote: "La política se controla por configuración.",
      defaultPurpose: "Sirve para comprobar la entrada de datos de {indicator}; la lectura de mercado está en la página del indicador.",
      deferredIntro: "Estas fuentes se dejan fuera por estabilidad y derechos claros:",
      deferredReasons: { move: "Reglas de redistribución complejas; revisar antes de mostrar.", oas: "Redistribución más restringida; no se muestra públicamente ahora.", putCall: "Estabilidad de fuente y derechos pendientes.", vvix: "Límite de scraping y derechos no cerrado.", skew: "Límite de scraping y derechos no cerrado." },
    },
    articlesPage: {
      metaDescription: "Notas simples sobre VIX, estructura de volatilidad y presión financiera.",
    },
    articleLabels: { "what-is-vix": "Qué es VIX", "why-not-just-vix": "Por qué VIX no basta", "vix-vs-vix3m": "VIX y 3 meses", "vix-vxn-rvx-differences": "VIX/VXN/RVX", "stlfsi-vs-nfci": "STLFSI4 y NFCI", "how-to-read-market-risk-dashboard": "Cómo leer el panel" },
    indicatorCopy: esIndicatorCopy,
    articleCopy: esArticleCopy,
    about: { metaTitle: "Acerca de", metaDescription: "Objetivo, límites, fuentes y principios de calidad de StressSignal.", title: "Acerca de StressSignal", subtitle: "Para qué sirve, qué evita y qué promete.", sections: [{ title: "Por qué existe", body: ["StressSignal ayuda a leer el riesgo de mercado con más calma. No convierte un indicador en una señal de trading. Te ayuda a preguntar si el riesgo sigue local o se extiende."] }, { title: "Datos", body: ["Usamos fuentes públicas verificables y mantenemos visibles la fuente y la fecha de actualización."] }, { title: "Promesa", body: ["El contenido es para observación y educación, no para asesoramiento personalizado."] }], cta: "Ver fuentes y notas de derechos" },
    privacy: { metaTitle: "Privacidad", metaDescription: "Cómo StressSignal maneja registros técnicos, errores y analítica no personal.", title: "Privacidad", subtitle: "Mantenemos la recopilación de datos al mínimo.", sections: [{ title: "Qué procesamos", body: ["El sitio es para observar mercados públicos. Podemos guardar registros técnicos básicos para mantenerlo estable."] }, { title: "Fuentes externas", body: ["Los indicadores vienen de fuentes públicas y conservan etiquetas de origen."] }, { title: "Preguntas", body: ["Para dudas de privacidad o datos, usa el canal del proyecto."] }] },
    terms: { metaTitle: "Términos", metaDescription: "Términos de uso, límites de fuente y aviso de no asesoramiento.", title: "Términos de uso", subtitle: "Usa StressSignal como herramienta de lectura, no como instrucción personal de trading.", sections: [{ title: "Uso", body: ["El sitio es para observación e investigación de mercado."] }, { title: "No es asesoramiento", body: ["No damos recomendaciones de compra, venta, momento o tamaño de posición."] }, { title: "Fuentes", body: ["Las fuentes restringidas no se muestran por defecto hasta aclarar derechos."] }] },
  },
  de: {
    states: { calm: "Ruhig", watch: "Beobachten", warming: "Erwärmt sich", pressure: "Unter Druck", resonance: "Risiko breitet sich aus", insufficient: "Zu wenig Daten", waiting: "Warte auf Daten" },
    policy: { publicOk: "Öffentlich sichtbar", reviewRequired: "Prüfung nötig", licensedOnly: "Eingeschränkt", unknown: "Unbekannte Regel", publicSentence: "Für öffentliche Seiten genutzt.", restrictedSentence: "Vor Anzeige Lizenz prüfen.", noSources: "Noch keine Quellen", sourcePath: "Anzeigeregel" },
    license: { publicFred: "Öffentliche Reihe. Quellenlink und Aktualisierung bleiben sichtbar.", primaryLeg: "Hauptreihe für VIX/VXV aus öffentlicher FRED-Quelle.", secondaryLeg: "Ergänzende Reihe für VIX/VXV aus öffentlicher FRED-Quelle." },
    metadata: { publicSources: "Öffentliche Quellen", frequency: "Frequenz", updated: "Aktualisiert" },
    home: { metaDescription: "Mit VIX, VXN, RVX, STLFSI4 und NFCI erkennen, ob Marktrisiko breiter wird.", fallbackState: "Warte auf Daten", fallbackHeadline: "Der Datenabgleich ist noch nicht fertig. Lies zuerst die Treiber.", waitingData: "Warte auf Daten", snapshotPending: "Erscheint nach Datensync", percentileSuffix: "Perzentil", asOfPrefix: "Datenstand", driversSubtitle: "Nach 1J-Perzentil sortiert. Starte oben und öffne dann den Chart.", howToCta: "Dashboard-Guide lesen", chartTermTitle: "VIX / VXV: kurze gegen 3 Monate", chartTermSubtitle: "Täglicher Blick auf kurze und mittlere Volatilität", chartEquityTitle: "VIX / VXN / RVX / VXD", chartEquitySubtitle: "Täglicher Vergleich der Aktienvolatilität", chartStressTitle: "STLFSI4 und NFCI", chartStressSubtitle: "Wöchentlicher Blick auf Systemdruck", chartCompositeTitle: "Zusammengesetzter Risikoscore", chartCompositeSubtitle: "Erscheint mit genug Historie; bis dahin die Treiber lesen.", dataTitle: "Quellen und Anzeigeregeln", dataSourcesCta: "Datenquellen ansehen", indicatorsCta: "Indikatoren" },
    riskCard: { asOf: "Datenstand" },
    indicatorCard: { latest: "Aktuell", percentile: "1J-Perzentil", updated: "Aktualisiert", source: "Quelle", waitingSource: "Ausstehend", sampleShort: "Wenig Daten" },
    commentary: { missingSentence: "Diese Reihen sind unvollständig: {missing}. Die Lesart verbessert sich nach dem Sync.", branches: { equity_only_warming: { title: "Aktien stressen, System bestätigt noch nicht", body: "Aktienvolatilität wird neu bewertet, aber STLFSI4 und NFCI sind nicht hoch. Es bleibt zunächst lokaler Aktienmarktdruck." }, broad_equity_warming: { title: "Aktienstress wird breiter", body: "VIX, VXN und RVX sind erhöht. Die Bewegung ist nicht auf eine Ecke begrenzt." }, system_pressure_warming: { title: "Systemdruck steigt ebenfalls", body: "STLFSI4 und NFCI steigen gemeinsam. Die Tail-Risk-Lesart wird glaubwürdiger." }, term_structure_inversion: { title: "Kurze Volatilität wird teuer", body: "Kurzfristige Volatilität steigt gegenüber der Drei-Monats-Sicht. Der Markt zahlt mehr für nahen Schutz." } } },
    indicatorsPage: { metaDescription: "Risikoindikatoren nach aktuellem Wert, Bewegung und 1-Jahres-Perzentil.", empty: "Noch keine Indikator-Snapshots. Nach dem Datensync aktualisieren.", table: { indicator: "Indikator", latest: "Aktuell", changes: "1T / 5T / 20T", percentile: "1J-Perzentil", state: "Status", frequency: "Frequenz", sourceUpdated: "Quelle / Update", policy: "Regel" }, helpNote: "Guide und Datenquellen erklären Methode und Grenzen." },
    indicatorDetail: { metaSuffix: "Indikator", missingDescription: "Dieser Indikator ist gerade nicht verfügbar.", percentile: "1J-Perzentil", datasetDescription: "Datensatz zum Indikator.", definitionFallback: "Definition ist noch nicht bereit.", overviewFallback: "Dieser Indikator hilft, Marktstress und Risikoappetit zu lesen.", readHintFallback: "Mit verwandten Volatilitäts- und Stressindikatoren lesen.", caveatFallback: "Einzelereignisse können verzerren. Nutze Trend und Frequenz.", noHistory: "Keine Historie in diesem Zeitraum. Anderen Zeitraum wählen oder Sync abwarten.", historySuffix: "Historie", tips: ["Erst Richtung prüfen, dann Perzentil und Bewegungsgröße.", "Steigen verwandte Vola- oder Stressindikatoren mit, genauer hinsehen.", "Nutze Notizen, damit ein Indikator nicht zur ganzen Marktthese wird."], relatedJump: "Verwandte Indikatoren", methodEntry: "Methodenguide: ", methodLink: "dieses Signal lesen", unconfiguredSource: "Keine Quelle konfiguriert" },
    indicatorDefinition: { updated: "Indikator aktualisiert", frequency: "Frequenz", overview: "Was es bedeutet", howToRead: "So liest du es", misread: "Typischer Fehler", related: "Zusammen lesen mit", articles: "Verwandte Notizen", sources: "Quellen und Rechte" },
    howToRead: { metaTitle: "So lesen", metaDescription: "Ein einfacher Guide, um StressSignal nicht auf einen Indikator zu reduzieren.", title: "So liest du das Marktrisiko-Dashboard", subtitle: "Zwinge keine Zahl zur Schlussfolgerung. Lies Trend, Bestätigung und Grenzen zusammen.", sections: [{ title: "Nicht nur auf VIX starren", body: ["VIX ist nützlich, aber kein Krisenmesser. Um Ausbreitung zu erkennen, brauchst du weitere Ebenen."] }, { title: "Aktienebene lesen", body: [], bullets: ["Prüfen, ob VIX, VXN und RVX in dieselbe Richtung laufen.", "VIX/VXV nutzen, um teure kurze Volatilität zu erkennen.", "Persistenz wichtiger nehmen als einen Tag."] }, { title: "Systemebene lesen", body: [], bullets: ["STLFSI4 und NFCI zeigen, ob Kredit und Liquidität mitziehen.", "Steigt nur VIX, bleibt es vielleicht lokal.", "Steigen beide Ebenen, ist die Risikothese stärker."] }, { title: "Was Ausbreitung heißt", body: ["Ausbreitung heißt: mehrere Signale sind hoch und bewegen sich zusammen. Ein heißer Wert warnt; mehrere heiße Ebenen verdienen Aufmerksamkeit."] }], nextTitle: "Nächster Schritt", vixCta: "VIX öffnen", stlfsiCta: "STLFSI4 öffnen", dataCta: "Datenquellen" },
    dataSources: { metaDescription: "Öffentliche Quellen, Aktualisierungsfrequenz und Anzeigeregeln der Indikatoren.", table: { indicator: "Indikator", sourceCode: "Code", institution: "Institution", retrieval: "Methode", frequency: "Frequenz", updated: "Aktualisiert", policy: "Regel", notes: "Verwendung" }, retrieval: { fredApi: "FRED API", csv: "CSV", publicEndpoint: "Öffentlicher Endpunkt", manual: "Manuell", licensed: "Lizenzierte API" }, riskOk: "Kein besonderes Risiko", riskReview: "Prüfung nötig", riskPublic: "Öffentliche Anzeige erlaubt", defaultNote: "Basierend auf öffentlicher Quelle.", configNote: "Anzeigeregel kommt aus der Konfiguration.", defaultPurpose: "{indicator} nutzt diese Datenreihe als Eingang; die Markteinordnung steht auf der Indikatorseite.", deferredIntro: "Diese Quellen bleiben zurückgestellt, damit Produkt und Rechte stabil sind:", deferredReasons: { move: "Weitergaberegeln sind komplex; vor Anzeige prüfen.", oas: "Weitergabe stärker eingeschränkt; aktuell nicht öffentlich.", putCall: "Quellenstabilität und Rechte prüfen.", vvix: "Scraping- und Rechteabgrenzung offen.", skew: "Scraping- und Rechteabgrenzung offen." } },
    articlesPage: { metaDescription: "Einfache Notizen zu VIX, Terminstruktur und Finanzstress." },
    articleLabels: { "what-is-vix": "Was ist VIX", "why-not-just-vix": "Warum nicht nur VIX", "vix-vs-vix3m": "VIX und 3 Monate", "vix-vxn-rvx-differences": "VIX/VXN/RVX", "stlfsi-vs-nfci": "STLFSI4 und NFCI", "how-to-read-market-risk-dashboard": "Dashboard lesen" },
    indicatorCopy: deIndicatorCopy,
    articleCopy: deArticleCopy,
    about: { metaTitle: "Über uns", metaDescription: "Ziel, Grenzen, Quellenpolitik und Qualitätsprinzipien von StressSignal.", title: "Über StressSignal", subtitle: "Wofür es gedacht ist und wo die Grenzen liegen.", sections: [{ title: "Warum es existiert", body: ["StressSignal soll Marktrisiko ruhiger und konsistenter lesbar machen. Es macht aus einem Indikator kein Handelssignal."] }, { title: "Daten", body: ["Wir nutzen prüfbare öffentliche Quellen und zeigen Quelle sowie Aktualisierung."] }, { title: "Versprechen", body: ["Die Inhalte dienen Bildung und Marktbeobachtung, nicht persönlicher Anlageberatung."] }], cta: "Datenquellen ansehen" },
    privacy: { metaTitle: "Datenschutz", metaDescription: "Wie StressSignal technische Logs, Fehler und nicht-personenbezogene Analytik nutzt.", title: "Datenschutz", subtitle: "Wir halten Datenerfassung minimal.", sections: [{ title: "Was verarbeitet wird", body: ["Technische Logs können für Stabilität und Fehleranalyse gespeichert werden."] }, { title: "Quellen", body: ["Marktdaten stammen aus öffentlichen Quellen."] }, { title: "Fragen", body: ["Fragen zu Datenschutz oder Datenrechten bitte über den Projektkanal stellen."] }] },
    terms: { metaTitle: "Nutzung", metaDescription: "Nutzungsbedingungen, keine Anlageberatung und Grenzen öffentlicher Quellen.", title: "Nutzungsbedingungen", subtitle: "Nutze StressSignal als Research-Tool, nicht als Handelsanweisung.", sections: [{ title: "Nutzung", body: ["Die Seite dient der Marktbeobachtung und Forschung."] }, { title: "Keine Beratung", body: ["Wir geben keine Kauf-, Verkaufs- oder Positionsgrößenempfehlungen."] }, { title: "Quellen", body: ["Eingeschränkte Daten bleiben aus der Standardansicht, bis Rechte geklärt sind."] }] },
  },
  fr: {
    states: { calm: "Calme", watch: "À surveiller", warming: "En hausse", pressure: "Sous pression", resonance: "Risque qui se propage", insufficient: "Données insuffisantes", waiting: "En attente" },
    policy: { publicOk: "Affichage public", reviewRequired: "À vérifier", licensedOnly: "Restreint", unknown: "Règle inconnue", publicSentence: "Utilisé sur les pages publiques.", restrictedSentence: "Licence à vérifier avant affichage.", noSources: "Pas encore de source", sourcePath: "Règle d’affichage" },
    license: { publicFred: "Série publique. Le lien source et la date restent visibles.", primaryLeg: "Série principale VIX/VXV, issue d’une source publique FRED.", secondaryLeg: "Série d’appui VIX/VXV, issue d’une source publique FRED." },
    metadata: { publicSources: "Sources publiques", frequency: "Fréquence", updated: "Mis à jour" },
    home: { metaDescription: "Utiliser VIX, VXN, RVX, STLFSI4 et NFCI pour voir si le risque de marché se propage.", fallbackState: "En attente", fallbackHeadline: "La synchronisation n’est pas terminée. Lis d’abord les moteurs.", waitingData: "En attente", snapshotPending: "Visible après synchronisation", percentileSuffix: "percentile", asOfPrefix: "Date des données", driversSubtitle: "Trié par percentile 1 an. Commence par le haut, puis ouvre le graphique.", howToCta: "Lire le guide du tableau", chartTermTitle: "VIX / VXV : court terme vs 3 mois", chartTermSubtitle: "Vue quotidienne de la volatilité courte et moyenne", chartEquityTitle: "VIX / VXN / RVX / VXD", chartEquitySubtitle: "Comparaison quotidienne des volatilités actions", chartStressTitle: "STLFSI4 et NFCI", chartStressSubtitle: "Vue hebdomadaire de la pression système", chartCompositeTitle: "Score de risque composite", chartCompositeSubtitle: "S’affiche avec assez d’historique ; sinon lis les moteurs.", dataTitle: "Sources et règle d’affichage", dataSourcesCta: "Voir les sources", indicatorsCta: "Indicateurs" },
    riskCard: { asOf: "Date des données" },
    indicatorCard: { latest: "Dernier", percentile: "Percentile 1A", updated: "Mis à jour", source: "Source", waitingSource: "En attente", sampleShort: "Peu de données" },
    commentary: { missingSentence: "Ces séries sont incomplètes : {missing}. La lecture s’améliore une fois remplies.", branches: { equity_only_warming: { title: "Les actions chauffent, le système ne confirme pas encore", body: "La volatilité actions se repricie, mais STLFSI4 et NFCI ne sont pas hauts. La pression reste d’abord locale." }, broad_equity_warming: { title: "Le stress actions s’élargit", body: "VIX, VXN et RVX sont élevés. Le mouvement ne reste pas dans un seul coin du marché." }, system_pressure_warming: { title: "La pression système monte aussi", body: "STLFSI4 et NFCI progressent ensemble. Le scénario de risque extrême devient plus crédible." }, term_structure_inversion: { title: "La volatilité courte devient chère", body: "Le court terme monte face à la vue 3 mois. Le marché paie davantage pour une protection immédiate." } } },
    indicatorsPage: { metaDescription: "Voir les indicateurs de risque par dernier niveau, mouvement et percentile sur 1 an.", empty: "Pas encore de snapshots d’indicateurs. Actualise après la synchronisation.", table: { indicator: "Indicateur", latest: "Dernier", changes: "1J / 5J / 20J", percentile: "Percentile 1A", state: "État", frequency: "Fréquence", sourceUpdated: "Source / mise à jour", policy: "Règle" }, helpNote: "Le guide et les sources expliquent la méthode et les limites." },
    indicatorDetail: { metaSuffix: "Indicateur", missingDescription: "Cet indicateur n’est pas disponible maintenant.", percentile: "Percentile 1A", datasetDescription: "Jeu de données de l’indicateur.", definitionFallback: "La définition n’est pas encore prête.", overviewFallback: "Cet indicateur aide à lire le stress de marché et l’appétit pour le risque.", readHintFallback: "Lis-le avec les indicateurs liés, pas seul.", caveatFallback: "Un événement isolé peut déformer le signal. Utilise tendance et fréquence.", noHistory: "Pas d’historique sur cette période. Essaie une autre période ou attends la synchronisation.", historySuffix: "historique", tips: ["Regarde d’abord la direction, puis le percentile et l’ampleur.", "Si d’autres indicateurs montent ensemble, augmente l’attention.", "Utilise les notes pour ne pas transformer un indicateur en verdict complet."], relatedJump: "Indicateurs liés", methodEntry: "Guide méthode : ", methodLink: "lire ce signal", unconfiguredSource: "Aucune source configurée" },
    indicatorDefinition: { updated: "Indicateur mis à jour", frequency: "Fréquence", overview: "Ce que cela signifie", howToRead: "Comment le lire", misread: "Erreur courante", related: "Lire avec", articles: "Notes liées", sources: "Sources et droits" },
    howToRead: { metaTitle: "Mode d’emploi", metaDescription: "Un guide simple pour lire StressSignal sans surinterpréter un indicateur.", title: "Comment lire le tableau de risque", subtitle: "Ne force pas une conclusion avec un chiffre. Lis tendance, confirmation et limites ensemble.", sections: [{ title: "Ne regarde pas seulement le VIX", body: ["Le VIX est utile, mais ce n’est pas un compteur de crise. Pour juger la propagation, il faut d’autres couches."] }, { title: "Lire la couche actions", body: [], bullets: ["Vérifie si VIX, VXN et RVX vont dans le même sens.", "Utilise VIX/VXV pour voir si le court terme devient cher.", "Privilégie la persistance à un pic d’un jour."] }, { title: "Lire la couche système", body: [], bullets: ["STLFSI4 et NFCI montrent si crédit et liquidité accompagnent.", "Si seul VIX monte, l’histoire peut rester locale.", "Si les deux couches montent, la lecture est plus forte."] }, { title: "Ce qui compte comme propagation", body: ["La propagation signifie plusieurs signaux élevés et alignés. Un signal chaud avertit ; plusieurs couches chaudes méritent attention."] }], nextTitle: "Suite", vixCta: "Ouvrir VIX", stlfsiCta: "Ouvrir STLFSI4", dataCta: "Voir les sources" },
    dataSources: { metaDescription: "Sources publiques, fréquence de mise à jour et règles d’affichage des indicateurs.", table: { indicator: "Indicateur", sourceCode: "Code", institution: "Institution", retrieval: "Méthode", frequency: "Fréquence", updated: "Mis à jour", policy: "Règle", notes: "Usage" }, retrieval: { fredApi: "API FRED", csv: "CSV", publicEndpoint: "Point d’accès public", manual: "Manuel", licensed: "API sous licence" }, riskOk: "Pas de risque particulier", riskReview: "À vérifier", riskPublic: "Affichage public autorisé", defaultNote: "Basé sur une source publique.", configNote: "La règle d’affichage vient de la configuration.", defaultPurpose: "Sert à vérifier l’entrée de données de {indicator} ; la lecture de marché se fait sur la page de l’indicateur.", deferredIntro: "Ces sources sont différées pour garder le produit stable et les droits clairs :", deferredReasons: { move: "Règles de redistribution complexes ; vérifier avant affichage.", oas: "Redistribution plus restreinte ; non public pour l’instant.", putCall: "Stabilité de la source et droits à vérifier.", vvix: "Limite scraping/droits non finalisée.", skew: "Limite scraping/droits non finalisée." } },
    articlesPage: { metaDescription: "Notes simples sur le VIX, la structure de volatilité et la pression financière." },
    articleLabels: { "what-is-vix": "Qu’est-ce que le VIX", "why-not-just-vix": "Pourquoi pas seulement VIX", "vix-vs-vix3m": "VIX et 3 mois", "vix-vxn-rvx-differences": "VIX/VXN/RVX", "stlfsi-vs-nfci": "STLFSI4 et NFCI", "how-to-read-market-risk-dashboard": "Lire le tableau" },
    indicatorCopy: frIndicatorCopy,
    articleCopy: frArticleCopy,
    about: { metaTitle: "À propos", metaDescription: "Objectif, limites, sources et principes qualité de StressSignal.", title: "À propos de StressSignal", subtitle: "À quoi sert le produit, ce qu’il évite et ce qu’il promet.", sections: [{ title: "Pourquoi", body: ["StressSignal aide à lire le risque de marché de façon plus calme et régulière. Il ne transforme pas un indicateur en signal de trading."] }, { title: "Données", body: ["Nous utilisons des sources publiques vérifiables et affichons la source et la date de mise à jour."] }, { title: "Promesse", body: ["Le contenu sert à l’éducation et à l’observation du marché, pas au conseil personnalisé."] }], cta: "Voir les sources" },
    privacy: { metaTitle: "Confidentialité", metaDescription: "Comment StressSignal traite les journaux techniques, erreurs et mesures non personnelles.", title: "Confidentialité", subtitle: "Nous limitons la collecte de données.", sections: [{ title: "Ce que nous traitons", body: ["Des journaux techniques peuvent être conservés pour la stabilité du site."] }, { title: "Sources", body: ["Les indicateurs viennent de sources publiques."] }, { title: "Questions", body: ["Pour toute question, utilisez le canal du projet."] }] },
    terms: { metaTitle: "Conditions", metaDescription: "Conditions d’utilisation, absence de conseil et limites des sources publiques.", title: "Conditions d’utilisation", subtitle: "Utilisez StressSignal comme outil de recherche, pas comme instruction de trading.", sections: [{ title: "Utilisation", body: ["Le site sert à observer et étudier le marché."] }, { title: "Pas de conseil", body: ["Nous ne donnons pas de recommandation d’achat, de vente ou de taille de position."] }, { title: "Sources", body: ["Les données restreintes restent hors de la vue publique par défaut."] }] },
  },
  "pt-BR": {
    states: { calm: "Calmo", watch: "Atenção", warming: "Aquecendo", pressure: "Sob pressão", resonance: "Risco se espalhando", insufficient: "Dados insuficientes", waiting: "Aguardando dados" },
    policy: { publicOk: "Exibição pública", reviewRequired: "Requer revisão", licensedOnly: "Restrito", unknown: "Política desconhecida", publicSentence: "Usado em páginas públicas.", restrictedSentence: "Requer revisão de licença antes de exibir.", noSources: "Ainda sem fontes", sourcePath: "Política de exibição" },
    license: { publicFred: "Série pública. Mantemos link da fonte e data de atualização.", primaryLeg: "Série principal para VIX/VXV, vinda de fonte pública do FRED.", secondaryLeg: "Série de apoio para VIX/VXV, vinda de fonte pública do FRED." },
    metadata: { publicSources: "Fontes públicas", frequency: "Frequência", updated: "Atualizado" },
    home: { metaDescription: "Use VIX, VXN, RVX, STLFSI4 e NFCI para ver se o risco de mercado está se espalhando.", fallbackState: "Aguardando dados", fallbackHeadline: "A sincronização ainda não terminou. Leia primeiro os motores.", waitingData: "Aguardando dados", snapshotPending: "Aparece após sincronizar", percentileSuffix: "percentil", asOfPrefix: "Data dos dados", driversSubtitle: "Ordenado por percentil de 1 ano. Comece pelo topo e depois abra o gráfico.", howToCta: "Ler guia do painel", chartTermTitle: "VIX / VXV: curto contra 3 meses", chartTermSubtitle: "Visão diária da volatilidade curta e média", chartEquityTitle: "VIX / VXN / RVX / VXD", chartEquitySubtitle: "Comparação diária de volatilidade em ações", chartStressTitle: "STLFSI4 e NFCI", chartStressSubtitle: "Visão semanal da pressão sistêmica", chartCompositeTitle: "Score composto de risco", chartCompositeSubtitle: "Aparece com histórico suficiente; enquanto isso leia os motores.", dataTitle: "Fontes e política de exibição", dataSourcesCta: "Ver fontes de dados", indicatorsCta: "Indicadores" },
    riskCard: { asOf: "Data dos dados" },
    indicatorCard: { latest: "Último", percentile: "Percentil 1A", updated: "Atualizado", source: "Fonte", waitingSource: "Pendente", sampleShort: "Poucos dados" },
    commentary: { missingSentence: "Estas séries estão incompletas: {missing}. A leitura melhora quando forem preenchidas.", branches: { equity_only_warming: { title: "Ações aquecem, sistema ainda não confirma", body: "A volatilidade de ações está sendo reprificada, mas STLFSI4 e NFCI ainda não estão altos. Por enquanto parece pressão local." }, broad_equity_warming: { title: "O estresse em ações está ficando mais amplo", body: "VIX, VXN e RVX estão elevados. O movimento não está limitado a um pedaço do mercado." }, system_pressure_warming: { title: "A pressão sistêmica também sobe", body: "STLFSI4 e NFCI avançam juntos. A leitura de risco de cauda fica mais crível." }, term_structure_inversion: { title: "Volatilidade curta fica cara", body: "O curto prazo sobe contra a visão de 3 meses, sinal de mais demanda por proteção imediata." } } },
    indicatorsPage: { metaDescription: "Veja indicadores de risco por leitura recente, mudança e percentil de 1 ano.", empty: "Ainda não há snapshots de indicadores. Atualize após a sincronização.", table: { indicator: "Indicador", latest: "Último", changes: "1D / 5D / 20D", percentile: "Percentil 1A", state: "Estado", frequency: "Frequência", sourceUpdated: "Fonte / atualização", policy: "Política" }, helpNote: "O guia e a página de fontes explicam método e limites." },
    indicatorDetail: { metaSuffix: "Indicador", missingDescription: "Este indicador não está disponível agora.", percentile: "Percentil 1A", datasetDescription: "Conjunto de dados do indicador.", definitionFallback: "A definição ainda não está pronta.", overviewFallback: "Este indicador ajuda a ler estresse de mercado e apetite por risco.", readHintFallback: "Leia com indicadores relacionados, não sozinho.", caveatFallback: "Eventos pontuais podem distorcer o sinal. Use tendência e frequência.", noHistory: "Sem histórico nesse período. Tente outro intervalo ou aguarde a sincronização.", historySuffix: "histórico", tips: ["Veja primeiro a direção; depois percentil e tamanho do movimento.", "Se indicadores relacionados sobem juntos, aumente a atenção.", "Use as notas para não transformar um indicador na conclusão inteira."], relatedJump: "Indicadores relacionados", methodEntry: "Guia de método: ", methodLink: "como ler este sinal", unconfiguredSource: "Sem fonte configurada" },
    indicatorDefinition: { updated: "Indicador atualizado", frequency: "Frequência", overview: "O que significa", howToRead: "Como ler", misread: "Erro comum", related: "Ler junto com", articles: "Notas relacionadas", sources: "Fontes e direitos" },
    howToRead: { metaTitle: "Como ler", metaDescription: "Um guia simples para ler StressSignal sem depender de um indicador só.", title: "Como ler o painel de risco", subtitle: "Não force uma conclusão com um número. Leia tendência, confirmação e limites juntos.", sections: [{ title: "Não olhe só para o VIX", body: ["VIX é útil, mas não é medidor de crise. Para saber se o risco se espalha, você precisa de outras camadas."] }, { title: "Leia a camada de ações", body: [], bullets: ["Veja se VIX, VXN e RVX andam na mesma direção.", "Use VIX/VXV para ver se o curto prazo ficou caro.", "Dê mais peso à persistência do que a um salto de um dia."] }, { title: "Leia a camada sistêmica", body: [], bullets: ["STLFSI4 e NFCI mostram se crédito e liquidez acompanham.", "Se só VIX sobe, a história pode continuar local.", "Se as duas camadas sobem, a leitura fica mais forte."] }, { title: "O que conta como espalhamento", body: ["Risco se espalhando significa vários sinais altos e andando juntos. Um sinal quente alerta; várias camadas quentes merecem mais atenção."] }], nextTitle: "Próximo passo", vixCta: "Abrir VIX", stlfsiCta: "Abrir STLFSI4", dataCta: "Ver fontes" },
    dataSources: { metaDescription: "Fontes públicas, frequência de atualização e regras de exibição dos indicadores.", table: { indicator: "Indicador", sourceCode: "Código", institution: "Instituição", retrieval: "Método", frequency: "Frequência", updated: "Atualizado", policy: "Política", notes: "Uso" }, retrieval: { fredApi: "API FRED", csv: "CSV", publicEndpoint: "Endpoint público", manual: "Manual", licensed: "API licenciada" }, riskOk: "Sem risco especial", riskReview: "Requer revisão", riskPublic: "Pode ser exibido", defaultNote: "Baseado em fonte pública.", configNote: "A política vem da configuração.", defaultPurpose: "Serve para conferir a entrada de dados de {indicator}; a leitura de mercado fica na página do indicador.", deferredIntro: "Estas fontes ficam fora por estabilidade e clareza de direitos:", deferredReasons: { move: "Regras de redistribuição complexas; revisar antes de exibir.", oas: "Redistribuição mais restrita; não exibido publicamente agora.", putCall: "Estabilidade da fonte e direitos precisam de revisão.", vvix: "Limite de scraping e direitos não finalizado.", skew: "Limite de scraping e direitos não finalizado." } },
    articlesPage: { metaDescription: "Notas simples sobre VIX, estrutura de volatilidade e pressão financeira." },
    articleLabels: { "what-is-vix": "O que é VIX", "why-not-just-vix": "Por que não só VIX", "vix-vs-vix3m": "VIX e 3 meses", "vix-vxn-rvx-differences": "VIX/VXN/RVX", "stlfsi-vs-nfci": "STLFSI4 e NFCI", "how-to-read-market-risk-dashboard": "Como ler o painel" },
    indicatorCopy: ptBRIndicatorCopy,
    articleCopy: ptBRArticleCopy,
    about: { metaTitle: "Sobre", metaDescription: "Objetivo, limites, fontes e princípios de qualidade do StressSignal.", title: "Sobre o StressSignal", subtitle: "Para que serve, o que evita e o que promete.", sections: [{ title: "Por que existe", body: ["StressSignal ajuda a ler risco de mercado de forma mais calma e consistente. Não transforma um indicador em sinal de trade."] }, { title: "Dados", body: ["Usamos fontes públicas verificáveis e mostramos fonte e data de atualização."] }, { title: "Promessa", body: ["O conteúdo é para educação e observação de mercado, não para aconselhamento personalizado."] }], cta: "Ver fontes de dados" },
    privacy: { metaTitle: "Privacidade", metaDescription: "Como o StressSignal lida com logs técnicos, erros e análise não pessoal.", title: "Privacidade", subtitle: "Mantemos a coleta de dados no mínimo.", sections: [{ title: "O que processamos", body: ["Logs técnicos podem ser guardados para estabilidade e correção de erros."] }, { title: "Fontes", body: ["Os indicadores vêm de fontes públicas."] }, { title: "Dúvidas", body: ["Use o canal do projeto para dúvidas sobre privacidade ou dados."] }] },
    terms: { metaTitle: "Termos", metaDescription: "Termos de uso, aviso de não recomendação e limites das fontes públicas.", title: "Termos de uso", subtitle: "Use o StressSignal como ferramenta de pesquisa, não como instrução de trade.", sections: [{ title: "Uso", body: ["O site é para observação e pesquisa de mercado."] }, { title: "Não é recomendação", body: ["Não damos recomendação de compra, venda, timing ou tamanho de posição."] }, { title: "Fontes", body: ["Dados restritos ficam fora da visualização pública padrão até os direitos ficarem claros."] }] },
  },
  ja: {
    states: { calm: "落ち着き", watch: "注視", warming: "上昇中", pressure: "圧力あり", resonance: "リスク拡大", insufficient: "データ不足", waiting: "データ待ち" },
    policy: { publicOk: "公開表示可", reviewRequired: "確認が必要", licensedOnly: "制限あり", unknown: "方針不明", publicSentence: "公開ページで使用します。", restrictedSentence: "公開前にライセンス確認が必要です。", noSources: "まだ出所がありません", sourcePath: "表示方針" },
    license: { publicFred: "公開系列です。出所リンクと更新日を表示します。", primaryLeg: "VIX/VXV 表示の主系列です。公開 FRED 系列を使います。", secondaryLeg: "VIX/VXV 表示の補助系列です。公開 FRED 系列を使います。" },
    metadata: { publicSources: "公開ソース", frequency: "頻度", updated: "更新" },
    home: { fallbackState: "データ待ち", fallbackHeadline: "データ同期がまだ完了していません。まずドライバーを読んでください。", waitingData: "データ待ち", snapshotPending: "同期後に表示", percentileSuffix: "パーセンタイル", asOfPrefix: "データ日付", chartTermTitle: "VIX / VXV：短期と3か月", chartTermSubtitle: "短期と中期のボラティリティを日次で確認", chartEquityTitle: "VIX / VXN / RVX / VXD", chartEquitySubtitle: "株式ボラ指標の日次比較", chartStressTitle: "STLFSI4 と NFCI", chartStressSubtitle: "システム圧力の週次確認", chartCompositeTitle: "総合リスクスコア", chartCompositeSubtitle: "十分な履歴がある時に表示します。それまではドライバーを見ます。", dataTitle: "データ出所と表示方針", dataSourcesCta: "データ出所を見る", indicatorsCta: "指標" },
    riskCard: { asOf: "データ日付" },
    indicatorCard: { latest: "最新", percentile: "1年パーセンタイル", updated: "更新", source: "出所", waitingSource: "待機中", sampleShort: "データ不足" },
    commentary: { missingSentence: "次の系列は未完成です：{missing}。揃うと読みやすくなります。", branches: { equity_only_warming: { title: "株式は上昇、システムは未確認", body: "株式ボラは再評価されていますが、STLFSI4 と NFCI はまだ高くありません。まず局所的な株式圧力として読みます。" }, broad_equity_warming: { title: "株式ストレスが広がっています", body: "VIX、VXN、RVX が高く、動きは一部の株式だけに留まっていません。" }, system_pressure_warming: { title: "システム圧力も上がっています", body: "STLFSI4 と NFCI が一緒に上昇しています。テールリスクの読みは強くなります。" }, term_structure_inversion: { title: "短期ボラが高くなっています", body: "短期ボラが3か月の見方に対して上がっています。市場は目先の保護に多く払っています。" } } },
    indicatorsPage: { metaDescription: "最新値、変化、1年パーセンタイルで市場リスク指標を確認します。", empty: "まだ指標スナップショットがありません。同期後に更新してください。", table: { indicator: "指標", latest: "最新", changes: "1日 / 5日 / 20日", percentile: "1年パーセンタイル", state: "状態", frequency: "頻度", sourceUpdated: "出所 / 更新", policy: "方針" }, helpNote: "ガイドとデータ出所ページで、読み方とデータの範囲を確認できます。" },
    indicatorDetail: { metaSuffix: "指標", missingDescription: "この指標は現在利用できません。", percentile: "1年パーセンタイル", datasetDescription: "指標詳細データセットです。", definitionFallback: "指標の説明はまだ準備中です。", overviewFallback: "この指標は市場ストレスとリスク許容度を見る助けになります。", readHintFallback: "関連するボラやストレス指標と一緒に見てください。", caveatFallback: "単発イベントで歪むことがあります。トレンドと更新頻度を見ます。", noHistory: "この期間の履歴はまだありません。別の期間を試すか、次の同期を待ってください。", historySuffix: "履歴", tips: ["まず方向を見て、その後パーセンタイルと変化幅を見ます。", "関連指標も一緒に上がるなら、注意度を上げます。", "1つの指標を市場全体の結論にしないためにノートを使います。"], relatedJump: "関連指標", methodEntry: "読み方ガイド：", methodLink: "このシグナルの読み方", unconfiguredSource: "出所未設定" },
    indicatorDefinition: { updated: "指標更新", frequency: "更新頻度", overview: "意味", howToRead: "読み方", misread: "よくある誤読", related: "一緒に見る", articles: "関連ノート", sources: "出所と権利" },
    howToRead: { metaTitle: "読み方", metaDescription: "1つの指標に頼りすぎず StressSignal を読むための短いガイドです。", title: "市場リスクダッシュボードの読み方", subtitle: "1つの数字で結論を出さず、方向、確認、限界を一緒に見ます。", sections: [{ title: "VIX だけを見ない", body: ["VIX は便利ですが、危機メーターではありません。リスクが広がっているかを見るには他の層で確認します。"] }, { title: "株式の層を読む", body: [], bullets: ["VIX、VXN、RVX が同じ方向に動くか確認します。", "VIX/VXV で短期リスクが高くなっているか見ます。", "1日の跳ねではなく、持続性を重視します。"] }, { title: "システムの層を読む", body: [], bullets: ["STLFSI4 と NFCI で信用や流動性の圧力を確認します。", "VIX だけが上がるなら、まだ局所的かもしれません。", "両方の層が上がるなら、読みは強くなります。"] }, { title: "広がりとは何か", body: ["リスクの広がりとは、複数のシグナルが高く、同時に動くことです。1つの高い値は警告、複数の層ならより注意します。"] }], nextTitle: "次に見るもの", vixCta: "VIX を開く", stlfsiCta: "STLFSI4 を開く", dataCta: "データ出所を見る" },
    dataSources: { table: { indicator: "指標", sourceCode: "コード", institution: "機関", retrieval: "取得方法", frequency: "頻度", updated: "更新", policy: "方針", notes: "用途" }, retrieval: { fredApi: "FRED API", csv: "CSV", publicEndpoint: "公開エンドポイント", manual: "手動", licensed: "ライセンス API" }, riskOk: "特別なリスクなし", riskReview: "追加確認が必要", riskPublic: "公開表示可", defaultNote: "公開ソースに基づきます。", configNote: "表示方針は設定で管理します。", defaultPurpose: "{indicator} のデータ入力を確認するための項目です。市場の読み方は指標ページで確認します。", deferredIntro: "安定性と権利確認のため、次のソースは保留しています：", deferredReasons: { move: "再配布ルールが複雑なため、公開前に確認します。", oas: "再配布制限が強いため、現在は公開表示しません。", putCall: "ソース安定性と権利確認が必要です。", vvix: "スクレイピングと権利範囲が未確定です。", skew: "スクレイピングと権利範囲が未確定です。" } },
    articleLabels: { "what-is-vix": "VIX とは", "why-not-just-vix": "VIX だけでは足りない理由", "vix-vs-vix3m": "VIX と3か月", "vix-vxn-rvx-differences": "VIX/VXN/RVX", "stlfsi-vs-nfci": "STLFSI4 と NFCI", "how-to-read-market-risk-dashboard": "ダッシュボードの読み方" },
    indicatorCopy: jaIndicatorCopy,
    articleCopy: jaArticleCopy,
    about: { title: "StressSignal について", subtitle: "目的、避けること、約束すること。", sections: [{ title: "なぜ作ったか", body: ["StressSignal は市場リスクを落ち着いて一貫して読むためのツールです。1つの指標を売買シグナルにはしません。"] }, { title: "データ", body: ["確認できる公開ソースを使い、出所と更新日を表示します。"] }, { title: "約束", body: ["内容は教育と市場観察のためで、個別の投資助言ではありません。"] }], cta: "データ出所を見る" },
    privacy: { title: "プライバシー", subtitle: "データ収集は最小限にします。", sections: [{ title: "処理するもの", body: ["安定運用とエラー確認のため、基本的な技術ログを保存することがあります。"] }, { title: "外部ソース", body: ["市場指標は公開ソースから取得します。"] }, { title: "質問", body: ["プライバシーやデータ権利の質問はプロジェクト窓口へお願いします。"] }] },
    terms: { title: "利用規約", subtitle: "StressSignal は調査ツールであり、個別の売買指示ではありません。", sections: [{ title: "利用", body: ["このサイトは市場観察とリサーチのためのものです。"] }, { title: "投資助言ではありません", body: ["売買、タイミング、ポジションサイズの助言は行いません。"] }, { title: "ソースの範囲", body: ["権利が不明なデータは標準の公開画面に表示しません。"] }] },
  },
} satisfies Partial<Record<Locale, PartialDeep<Dictionary>>>;
