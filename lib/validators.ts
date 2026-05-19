import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['USER', 'ADMIN', 'SUPERADMIN']).optional(),
})

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
})

export const leadSchema = z.object({
  customerName: z.string().min(2, 'Customer name must be at least 2 characters'),
  mobile: z.string().regex(
    /^(\+91)?[6-9]\d{9}$/,
    'Please enter a valid 10-digit Indian mobile number'
  ),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  companyName: z.string().optional().or(z.literal('')),
  industryName: z.string().optional().or(z.literal('')),
  followUpDate: z.string().optional().or(z.literal('')),
  shortDescription: z.string().optional().or(z.literal('')),
  leadType: z.enum(['WhatsApp Marketing', 'AI Calling Agent', 'AI Chat Agent', 'Chat + Calling Agent'], {
    required_error: 'Please select a lead type',
  }),
})

// ─── Calling-Agent → CRM integration ─────────────────────────────
// Inbound lead/transfer/ping events from the Calling-Agent backend.
//
// `lead` and `transfer` are persisted into CallingAgentLead and MUST carry
// the integration contract fields (crmUserId, externalCallId, customerPhone)
// — otherwise we end up with orphan rows invisible to non-superadmins. The
// fields are optional in the base shape so `ping` can omit them, and a
// `superRefine` enforces them for real events.
//
// `ping` is the admin "Test Connection" probe — it skips the DB write but
// the CRM still validates crmUserId on the route so a wrong CRM user ID
// cannot pass a Test that later fails every real sync.
export const callingAgentEventSchema = z
  .object({
    externalEventKey: z.string().min(3).max(200),
    eventType: z.enum(['lead', 'transfer', 'ping']),
    externalCallId: z.string().optional().nullable(),
    callingUserId: z.string().optional().nullable(),
    agentId: z.string().optional().nullable(),
    agentName: z.string().optional().nullable(),
    crmUserId: z.string().optional().nullable(),
    crmUserEmail: z.string().optional().nullable(),
    customerPhone: z.string().optional().nullable(),
    campaignId: z.string().optional().nullable(),
    campaignName: z.string().optional().nullable(),
    callDateTime: z.string().optional().nullable(),
    duration: z.number().optional().nullable(),
    summary: z.string().optional().nullable(),
    transcript: z.any().optional().nullable(),
    leadQualifier: z.any().optional().nullable(),
    leadReason: z.string().optional().nullable(),
    transferStatus: z.string().optional().nullable(),
    transferToNumber: z.string().optional().nullable(),
    recordingStatus: z.string().optional().nullable(),
    rawCallStatus: z.string().optional().nullable(),
    rawCallOutcome: z.string().optional().nullable(),
    ping: z.boolean().optional(),
  })
  .passthrough()
  .superRefine((event, ctx) => {
    if (event.eventType === 'ping') return
    // Real events MUST carry an owner identifier — either crmUserEmail
    // (primary, admin-facing) or the legacy crmUserId (for older agent
    // configs still saved with an ObjectId). At least one must be present
    // and non-blank, otherwise the row would be orphaned and invisible.
    const hasEmail = !!event.crmUserEmail && String(event.crmUserEmail).trim().length > 0
    const hasId = !!event.crmUserId && String(event.crmUserId).trim().length > 0
    if (!hasEmail && !hasId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['crmUserEmail'],
        message:
          'crmUserEmail (or legacy crmUserId) is required for lead/transfer events',
      })
    }
    if (!event.externalCallId || !String(event.externalCallId).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['externalCallId'],
        message: 'externalCallId is required for lead/transfer events',
      })
    }
    if (!event.customerPhone || !String(event.customerPhone).trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['customerPhone'],
        message: 'customerPhone is required for lead/transfer events',
      })
    }
  })

export type CallingAgentEventInput = z.infer<typeof callingAgentEventSchema>

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type LeadInput = z.infer<typeof leadSchema>
