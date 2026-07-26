export const BILL_ICON_MAP: { match: RegExp; icon: string; category: string }[] = [
  { match: /agua|água/i, icon: "💧", category: "Utilidades" },
  { match: /luz|eletric|energia|edp/i, icon: "⚡", category: "Utilidades" },
  { match: /gas|gás/i, icon: "🔥", category: "Utilidades" },
  { match: /internet|meo|nos|vodafone|nowo|fibra/i, icon: "🌐", category: "Telecom" },
  { match: /telem|movel|móvel|telefone/i, icon: "📱", category: "Telecom" },
  { match: /netflix|hbo|disney|prime|streaming/i, icon: "🎬", category: "Subscrição" },
  { match: /spotify|music|apple music|tidal/i, icon: "🎵", category: "Subscrição" },
  { match: /seguro|insurance/i, icon: "🛡️", category: "Seguros" },
  { match: /ginas|ginásio|gym|fitness/i, icon: "🏋️", category: "Saúde" },
  { match: /renda|arrendamento|casa|mortgage|crédito|credito/i, icon: "🏠", category: "Habitação" },
  { match: /carro|auto|combustivel|combustível|gasolina/i, icon: "🚗", category: "Transporte" },
  { match: /escola|colegio|colégio|educação|educacao/i, icon: "🎓", category: "Educação" },
  { match: /comida|super|mercado/i, icon: "🛒", category: "Alimentação" },
  { match: /banco|cartão|cartao|prestação|prestacao/i, icon: "💳", category: "Financeiro" },
];

export function getBillIcon(name: string): { icon: string; category: string } {
  for (const entry of BILL_ICON_MAP) {
    if (entry.match.test(name)) return { icon: entry.icon, category: entry.category };
  }
  return { icon: "🧾", category: "Outros" };
}
