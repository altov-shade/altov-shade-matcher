export const analyzeSkinTone = async (_base64Image: string) => {
  console.log("Temporary shade match service running");

  await new Promise((resolve) => setTimeout(resolve, 1500));

  return {
    primaryMatch: {
      id: "hf-5",
      code: "HF 5",
      name: "HF 5",
      description: "Balanced medium shade with warm-neutral undertones.",
    },
    range: [
      {
        id: "hf-4",
        code: "HF 4",
        name: "HF 4",
        description: "Slightly lighter option in your range.",
      },
      {
        id: "hf-5",
        code: "HF 5",
        name: "HF 5",
        description: "Your closest suggested AltoV match.",
      },
      {
        id: "hf-6",
        code: "HF 6",
        name: "HF 6",
        description: "Slightly deeper option in your range.",
      },
    ],
  };
};
