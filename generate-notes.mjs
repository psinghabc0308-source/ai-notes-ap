
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
    });
  }

  try {
    const { subject, topic, style } = await req.json();

    if (
      typeof subject !== "string" ||
      typeof topic !== "string" ||
      !subject.trim() ||
      !topic.trim() ||
      subject.length > 100 ||
      topic.length > 300
    ) {
      return Response.json(
        { error: "Please enter a valid subject and topic." },
        { status: 400 }
      );
    }

    const apiKey = Netlify.env.get("OPENAI_API_KEY");

    if (!apiKey) {
      return Response.json(
        { error: "AI setup is incomplete. Please configure the API key." },
        { status: 500 }
      );
    }

    const notesStyle =
      style === "Short"
        ? "short revision notes"
        : style === "Detailed"
        ? "detailed notes with examples"
        : "both short revision notes and detailed notes with examples";

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          instructions:
            "You are a helpful B.Tech Computer Science study assistant. Write accurate, easy-to-understand English study notes with headings, definitions and examples. If appropriate, include important exam questions.",
          input: `Subject: ${subject.trim()}\nTopic: ${topic.trim()}\nCreate ${notesStyle}.`,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: "The AI service could not generate notes. Please check the API setup." },
        { status: 502 }
      );
    }

    const notes = (data.output || [])
      .flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text)
      .join("\n");

    if (!notes) {
      return Response.json(
        { error: "No notes were returned. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ notes });
  } catch {
    return Response.json(
      { error: "Request failed. Please try again." },
      { status: 400 }
    );
  }
};
