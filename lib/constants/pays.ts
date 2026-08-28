export interface CountryCallingCode {
  code: string;       // ex: "CA"
  name: string;       // ex: "Canada"
  dialCode: string;   // ex: "+1"
  flag: string;       // ex: "🇨🇦"
  placeholder: string; // ex: "819-555-1234"
  regex: RegExp;      // Validation regex locale
}

export const COUNTRIES: CountryCallingCode[] = [
  {
    code: "CA",
    name: "Canada / USA",
    dialCode: "+1",
    flag: "🇨🇦",
    placeholder: "819-555-1234",
    regex: /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/
  },
  {
    code: "FR",
    name: "France",
    dialCode: "+33",
    flag: "🇫🇷",
    placeholder: "6 12 34 56 78",
    regex: /^[1-9]([-.\s]?\d{2}){4}$/
  },
  {
    code: "CI",
    name: "Côte d'Ivoire",
    dialCode: "+225",
    flag: "🇨🇮",
    placeholder: "07 01 02 03 04",
    regex: /^\d{10}$/
  },
  {
    code: "SN",
    name: "Sénégal",
    dialCode: "+221",
    flag: "🇸🇳",
    placeholder: "77 123 45 67",
    regex: /^\d{9}$/
  },
  {
    code: "CM",
    name: "Cameroun",
    dialCode: "+237",
    flag: "🇨🇲",
    placeholder: "6 12 34 56 78",
    regex: /^\d{9}$/
  },
  {
    code: "BE",
    name: "Belgique",
    dialCode: "+32",
    flag: "🇧🇪",
    placeholder: "470 12 34 56",
    regex: /^\d{9}$/
  },
  {
    code: "CH",
    name: "Suisse",
    dialCode: "+41",
    flag: "🇨🇭",
    placeholder: "79 123 45 67",
    regex: /^\d{9}$/
  },
  {
    code: "MA",
    name: "Maroc",
    dialCode: "+212",
    flag: "🇲🇦",
    placeholder: "6 12 34 56 78",
    regex: /^[5-7]\d{8}$/
  },
  {
    code: "DZ",
    name: "Algérie",
    dialCode: "+213",
    flag: "🇩🇿",
    placeholder: "5 12 34 56 78",
    regex: /^[5-7]\d{8}$/
  },
  {
    code: "TN",
    name: "Tunisie",
    dialCode: "+216",
    flag: "🇹🇳",
    placeholder: "20 123 456",
    regex: /^\d{8}$/
  },
  {
    code: "HT",
    name: "Haïti",
    dialCode: "+509",
    flag: "🇭🇹",
    placeholder: "31 23 4567",
    regex: /^\d{8}$/
  }
];
