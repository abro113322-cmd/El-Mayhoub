import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

import { executeAIAction } from "@/lib/ai/executor";
import { processMessage } from "@/lib/ai/brain";

import {
  addUserMessage,
  addAssistantMessage,
  buildConversation,
} from "@/lib/ai/brain/conversation";

import { buildPrompt } from "@/lib/ai/brain/promptBuilder";
import {
  checkRateLimit,
  getRequestAddress,
  rateLimitResponse,
} from "@/lib/rate-limit";

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
  throw new Error("GEMINI_API_KEY is missing.");
}

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

const MAX_MESSAGE_LENGTH = 4000;
const MAX_REQUEST_BYTES = 16_384;

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // Authenticate the current session
    // --------------------------------------------------

    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          reply: "Unauthorized.",
        },
        {
          status: 401,
        }
      );
    }

    try {
      const rateLimit = await checkRateLimit({
        key: `ai:user:${user.id}:${getRequestAddress(request)}`,
        limit: 20,
        windowSeconds: 60,
      });

      if (!rateLimit.allowed) {
        return rateLimitResponse(rateLimit.retryAfterSeconds);
      }
    } catch (rateLimitError) {
      console.error("AI rate limiter unavailable:", rateLimitError);
      return NextResponse.json(
        {
          success: false,
          reply: "The AI service is temporarily unavailable.",
        },
        { status: 503 }
      );
    }

    if (
      request.headers.get("content-type")?.split(";")[0].trim() !==
      "application/json"
    ) {
      return NextResponse.json(
        {
          success: false,
          reply: "Content-Type must be application/json.",
        },
        { status: 415 }
      );
    }

    // --------------------------------------------------
    // Parse request body
    // --------------------------------------------------

    const contentLength = Number(
      request.headers.get("content-length") ?? ""
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          reply: "Request body is too large.",
        },
        { status: 413 }
      );
    }

    let body: unknown;

    try {
      const rawBody = await request.text();

      if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
        return NextResponse.json(
          {
            success: false,
            reply: "Request body is too large.",
          },
          { status: 413 }
        );
      }

      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          reply: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      !("message" in body)
    ) {
      return NextResponse.json(
        {
          success: false,
          reply: "Message is required.",
        },
        {
          status: 400,
        }
      );
    }

    const rawMessage = (body as { message?: unknown }).message;

    if (Object.keys(body as object).some((key) => key !== "message")) {
      return NextResponse.json(
        {
          success: false,
          reply: "Unexpected request fields.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // Validate message
    // --------------------------------------------------

    if (typeof rawMessage !== "string") {
      return NextResponse.json(
        {
          success: false,
          reply: "Message must be a string.",
        },
        {
          status: 400,
        }
      );
    }

    const message = rawMessage.trim();

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          reply: "Message cannot be empty.",
        },
        {
          status: 400,
        }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          reply: `Message is too long. Maximum length is ${MAX_MESSAGE_LENGTH} characters.`,
        },
        {
          status: 400,
        }
      );
    }

    // --------------------------------------------------
    // IMPORTANT SECURITY RULE
    //
    // Never trust a userId coming from the client.
    // The authenticated session is the only source of identity.
    // --------------------------------------------------

    const userId = user.id;

    // --------------------------------------------------
    // Save user message
    // --------------------------------------------------

    await addUserMessage(userId, message);

    // --------------------------------------------------
    // Process AI request
    // --------------------------------------------------

    const brain = await processMessage(
      message,
      userId
    );

    const conversation = await buildConversation(
      userId
    );

    const prompt = buildPrompt({
      userMessage: brain.originalMessage,
      context: brain.context,
      conversation,
    });

    // --------------------------------------------------
    // Generate AI response
    // --------------------------------------------------

    const result = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    const aiReply = result.text?.trim() ?? "";

    if (!aiReply) {
      return NextResponse.json(
        {
          success: false,
          reply:
            "لم يتم الحصول على رد من الذكاء الاصطناعي. حاول مرة أخرى.",
        },
        {
          status: 502,
        }
      );
    }

    // --------------------------------------------------
    // Save assistant response
    // --------------------------------------------------

    await addAssistantMessage(
      userId,
      aiReply
    );

    // --------------------------------------------------
    // Execute supported AI action
    // --------------------------------------------------

    const executed = await executeAIAction(
      aiReply,
      userId
    );

    return NextResponse.json({
      success: executed.success,
      reply: executed.message,
    });
  } catch (error: unknown) {
    // --------------------------------------------------
    // Server-side logging only
    //
    // Do NOT log:
    // - user messages
    // - prompts
    // - AI responses
    // - sensitive financial context
    // --------------------------------------------------

    console.error(
      "AI API error:",
      error
    );

    const errorRecord =
      typeof error === "object" &&
      error !== null
        ? (error as Record<string, unknown>)
        : null;

    const errorMessage =
      typeof errorRecord?.message === "string"
        ? errorRecord.message
        : typeof errorRecord?.error === "object" &&
            errorRecord.error !== null &&
            typeof (
              errorRecord.error as Record<
                string,
                unknown
              >
            ).message === "string"
          ? (
              errorRecord.error as Record<
                string,
                unknown
              >
            ).message as string
          : "";

    const errorCode =
      errorRecord?.code ??
      errorRecord?.status ??
      (typeof errorRecord?.error === "object" &&
      errorRecord.error !== null
        ? (
            errorRecord.error as Record<
              string,
              unknown
            >
          ).code
        : undefined);

    const normalizedCode = String(
      errorCode ?? ""
    );

    const normalizedMessage =
      errorMessage.toLowerCase();

    const isQuotaError =
      normalizedCode === "429" ||
      normalizedMessage.includes("429") ||
      normalizedMessage.includes(
        "resource_exhausted"
      ) ||
      normalizedMessage.includes("quota") ||
      normalizedMessage.includes(
        "quota exceeded"
      );

    if (isQuotaError) {
      return NextResponse.json(
        {
          success: false,
          reply:
            "خدمة الذكاء الاصطناعي وصلت للحد المجاني حاليًا. حاول مرة أخرى لاحقًا.",
        },
        {
          status: 429,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        reply:
          "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. حاول مرة أخرى.",
      },
      {
        status: 500,
      }
    );
  }
}