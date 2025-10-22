/**
 * iMessage Integration for Jarvis
 *
 * Privacy-first iMessage communication channel that allows Jarvis
 * to respond to business inquiries via iMessage.
 *
 * Features:
 * - Read incoming messages from iMessage database
 * - Send responses via AppleScript
 * - Redact sensitive information
 * - Route to appropriate Jarvis agents
 * - Approval queue for high-risk responses
 */

export { IMessageReader, IMessage } from './reader';
export { IMessageSender, SendMessageOptions } from './sender';
export { MessageRedactor, RedactionRule, RedactionResult, messageRedactor } from './redact';
export {
  MessageRouter,
  MessageIntent,
  ResponseAction,
  RoutingDecision
} from './router';
