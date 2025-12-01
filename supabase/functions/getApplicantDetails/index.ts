import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const JOTFORM_API_KEY = Deno.env.get('JOTFORM_API_KEY')
        if (!JOTFORM_API_KEY) {
            throw new Error('Missing JOTFORM_API_KEY')
        }

        const { applicantId, email } = await req.json()

        if (!applicantId) {
            throw new Error('Missing applicantId')
        }

        // Form IDs
        const FORMS = {
            APPLICATION: '241904161216448',
            EMERGENCY: '241904172937460',
            I9: '241904132956457',
            VACCINATION: '241903896305461',
            LICENSES: '241904101484449',
            BACKGROUND: '241903864179465'
        }

        // 1. Fetch Main Application Details
        const mainResponse = await fetch(`https://api.jotform.com/submission/${applicantId}?apiKey=${JOTFORM_API_KEY}`)
        if (!mainResponse.ok) throw new Error('Failed to fetch application details')
        const mainData = await mainResponse.json()

        // Helper to extract answers
        const extractAnswers = (submission: any) => {
            const answers: any = {}

            // Handle both single submission response (has .content) and list item (has .answers directly)
            const answersObj = submission.answers || (submission.content && submission.content.answers)

            if (!answersObj) return answers

            Object.values(answersObj).forEach((ans: any) => {
                // Use the field name if available
                if (ans.name) {
                    answers[ans.name] = ans.answer
                }

                // Also map by type to ensure we get critical fields even if named differently
                if (ans.type === 'control_email') {
                    answers['email'] = ans.answer;
                }
                if (ans.type === 'control_fullname') {
                    answers['fullName'] = ans.answer;
                }
                if (ans.type === 'control_phone') {
                    answers['phoneNumber'] = ans.answer;
                }
                // Try to find position if not named explicitly
                if (!answers['positionApplied'] && (ans.name === 'positionApplied' || (ans.text && ans.text.toLowerCase().includes('position')))) {
                    answers['positionApplied'] = ans.answer;
                }
            })
            return answers
        }

        const mainAnswers = extractAnswers(mainData)
        const applicantEmail = mainAnswers.email
        const applicantName = mainAnswers.fullName // Object { first, last } or string

        // Debug info collector
        const debugInfo: any = {
            targetEmail: applicantEmail,
            targetName: applicantName,
            forms: {}
        }

        // Helper to fetch submissions for a form and find match by email or name
        const fetchMatchingSubmission = async (formId: string, targetEmail: string, targetName?: any) => {
            try {
                // Fetch recent submissions (limit 50 to be safe on rate limits/performance)
                const url = `https://api.jotform.com/form/${formId}/submissions?apiKey=${JOTFORM_API_KEY}&limit=50&orderby=created_at,desc`
                const res = await fetch(url)
                if (!res.ok) {
                    debugInfo.forms[formId] = { error: `Fetch failed: ${res.status}` }
                    return null
                }
                const data = await res.json()

                if (!data.content || !Array.isArray(data.content)) {
                    debugInfo.forms[formId] = { error: 'No content' }
                    return null
                }

                // Debug: Capture first submission keys and values to see structure
                if (data.content.length > 0) {
                    const firstAns = extractAnswers(data.content[0])
                    debugInfo.forms[formId] = {
                        foundCount: data.content.length,
                        firstSubmissionKeys: Object.keys(firstAns),
                        // Log first 3 values to help debug matching issues
                        sampleValues: Object.values(firstAns).slice(0, 5)
                    }
                }

                // Find match
                const match = data.content.find((sub: any) => {
                    const ans = extractAnswers(sub)

                    // Flatten all values to strings for searching
                    const values = Object.values(ans).map(v =>
                        typeof v === 'object' ? JSON.stringify(v).toLowerCase() : String(v).toLowerCase()
                    )

                    // 1. Email Match
                    if (targetEmail) {
                        const emailLower = targetEmail.toLowerCase()
                        const emailMatch = values.some(v => v.includes(emailLower))
                        if (emailMatch) return true
                    }

                    // 2. Name Match (Fallback)
                    if (targetName) {
                        let first = '', last = '';
                        if (typeof targetName === 'object') {
                            first = (targetName.first || '').toLowerCase();
                            last = (targetName.last || '').toLowerCase();
                        } else if (typeof targetName === 'string') {
                            const parts = targetName.split(' ');
                            first = (parts[0] || '').toLowerCase();
                            last = (parts[parts.length - 1] || '').toLowerCase();
                        }

                        if (first && last) {
                            const fullNameStr = `${first} ${last}`

                            // A. Check if full name string exists in any stringified value
                            const simpleMatch = values.some(v => v.includes(fullNameStr))
                            if (simpleMatch) return true

                            // B. Check ALL structured values for a name match
                            const structuredMatch = Object.values(ans).some((val: any) => {
                                if (val && typeof val === 'object' && val.first && val.last) {
                                    return val.first.toLowerCase() === first && val.last.toLowerCase() === last
                                }
                                return false
                            })
                            if (structuredMatch) return true
                        }
                    }

                    return false
                })

                if (match) {
                    return {
                        id: match.id,
                        created_at: match.created_at,
                        status: match.status,
                        url: `https://www.jotform.com/submission/${match.id}`
                    }
                }

                return null
            } catch (e: any) {
                debugInfo.forms[formId] = { error: e.message }
                console.error(`Error fetching form ${formId}:`, e)
                return null
            }
        }

        // Fetch other forms in parallel
        let relatedForms: any = {
            emergency_contact: null,
            i9_eligibility: null,
            vaccination: null,
            licenses: null,
            background_check: null
        }

        // We try to match if we have either email or name
        if (applicantEmail || applicantName) {
            const [emergency, i9, vaccination, licenses, background] = await Promise.all([
                fetchMatchingSubmission(FORMS.EMERGENCY, applicantEmail, applicantName),
                fetchMatchingSubmission(FORMS.I9, applicantEmail, applicantName),
                fetchMatchingSubmission(FORMS.VACCINATION, applicantEmail, applicantName),
                fetchMatchingSubmission(FORMS.LICENSES, applicantEmail, applicantName),
                fetchMatchingSubmission(FORMS.BACKGROUND, applicantEmail, applicantName)
            ])

            relatedForms = {
                emergency_contact: { ...emergency, formUrl: `https://form.jotform.com/${FORMS.EMERGENCY}` },
                i9_eligibility: { ...i9, formUrl: `https://form.jotform.com/${FORMS.I9}` },
                vaccination: { ...vaccination, formUrl: `https://form.jotform.com/${FORMS.VACCINATION}` },
                licenses: { ...licenses, formUrl: `https://form.jotform.com/${FORMS.LICENSES}` },
                background_check: { ...background, formUrl: `https://form.jotform.com/${FORMS.BACKGROUND}` }
            }
        }

        const responseData = {
            id: mainData.content.id,
            created_at: mainData.content.created_at,
            status: mainData.content.status,
            answers: mainAnswers,
            ...relatedForms,
            _debug: debugInfo
        }

        return new Response(JSON.stringify(responseData), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
