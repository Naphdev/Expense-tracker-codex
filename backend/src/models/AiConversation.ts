import mongoose, { Schema } from "mongoose";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}

export interface AiConversationDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  messages: AiMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const aiConversationSchema = new Schema<AiConversationDocument>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    messages: [
      {
        role: { type: String, enum: ["user", "assistant"], required: true },
        content: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

aiConversationSchema.index({ userId: 1, updatedAt: -1 });

export const AiConversation = mongoose.model<AiConversationDocument>("AiConversation", aiConversationSchema);
