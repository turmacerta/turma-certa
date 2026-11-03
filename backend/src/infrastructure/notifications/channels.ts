export type Channel = "push" | "email" | "whatsapp";

export type ChannelStatus = "sent" | "mock" | "skipped" | "failed";

export type ChannelResult = { status: ChannelStatus; reason?: string };

export type OutgoingMessage = {
  recipientName: string;
  email: string | null;
  phone: string | null;
  profileId: string | null;
  title: string;
  body: string;
};

export const CHANNELS: Channel[] = ["push", "email", "whatsapp"];

function mock(channel: Channel, to: string, message: OutgoingMessage): ChannelResult {
  console.info(`[notify:${channel}:mock] ${to} | ${message.title} | ${message.body}`);
  return { status: "mock" };
}

const senders: Record<Channel, (message: OutgoingMessage) => Promise<ChannelResult>> = {
  async push(message) {
    if (!message.profileId) {
      return { status: "skipped", reason: "NO_APP" };
    }
    return mock("push", message.profileId, message);
  },
  async email(message) {
    if (!message.email) {
      return { status: "skipped", reason: "NO_EMAIL" };
    }
    return mock("email", message.email, message);
  },
  async whatsapp(message) {
    const digits = (message.phone ?? "").replace(/\D/g, "");
    if (digits.length < 10) {
      return { status: "skipped", reason: "NO_PHONE" };
    }
    return mock("whatsapp", digits.startsWith("55") ? digits : `55${digits}`, message);
  },
};

export async function deliverEmail(message: OutgoingMessage): Promise<ChannelResult> {
  try {
    return await senders.email(message);
  } catch (err) {
    return { status: "failed", reason: err instanceof Error ? err.message : "UNKNOWN" };
  }
}

export async function deliver(message: OutgoingMessage) {
  const results = await Promise.all(
    CHANNELS.map(async (channel) => {
      try {
        return [channel, await senders[channel](message)] as const;
      } catch (err) {
        return [channel, { status: "failed", reason: err instanceof Error ? err.message : "UNKNOWN" } as ChannelResult] as const;
      }
    }),
  );
  return Object.fromEntries(results) as Record<Channel, ChannelResult>;
}
