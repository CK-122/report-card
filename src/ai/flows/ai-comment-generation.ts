'use server';
/**
 * @fileOverview A Genkit flow for generating personalized narrative comments for student report cards.
 *
 * - generateAiComment - A function that handles the AI comment generation process.
 * - AiCommentGenerationInput - The input type for the generateAiComment function.
 * - AiCommentGenerationOutput - The return type for the generateAiComment function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiCommentGenerationInputSchema = z.object({
  studentName: z.string().describe('The name of the student.'),
  subject: z.string().describe('The subject for which the comment is being generated (e.g., "Mathematics", "English Literature").'),
  grades: z.array(
    z.object({
      assignment: z.string().describe('The name or type of the assignment/assessment.'),
      score: z.string().describe('The student\u0027s score or grade for the assignment (e.g., "A", "85%", "Exceeds Expectations").'),
      feedback: z.string().optional().describe('Optional specific feedback provided for this assignment.'),
    })
  ).describe('An array of the student\u0027s grades and associated feedback for various assignments.'),
  rubricDescription: z.string().describe('A detailed description of the rubric or grading criteria used for the subject.'),
  additionalContext: z.string().optional().describe('Any additional context or specific observations about the student\u0027s performance, behavior, or progress.'),
});
export type AiCommentGenerationInput = z.infer<typeof AiCommentGenerationInputSchema>;

const AiCommentGenerationOutputSchema = z.object({
  comment: z.string().describe('The personalized narrative comment generated for the student.'),
});
export type AiCommentGenerationOutput = z.infer<typeof AiCommentGenerationOutputSchema>;

export async function generateAiComment(input: AiCommentGenerationInput): Promise<AiCommentGenerationOutput> {
  return aiCommentGenerationFlow(input);
}

const aiCommentGenerationPrompt = ai.definePrompt({
  name: 'aiCommentGenerationPrompt',
  input: { schema: AiCommentGenerationInputSchema },
  output: { schema: AiCommentGenerationOutputSchema },
  prompt: `You are an academic staff member tasked with writing a personalized narrative comment for a student's report card. Generate a comprehensive and individualized comment for {{{studentName}}} in {{{subject}}} based on the provided grades, rubric description, and additional context.

Here are {{{studentName}}}'s grades and feedback:
{{#each grades}}
- Assignment: {{{assignment}}}, Score: {{{score}}}
  {{#if feedback}}Feedback: {{{feedback}}}{{/if}}
{{/each}}

Rubric Description for {{{subject}}}:
{{{rubricDescription}}}

Additional Context about {{{studentName}}}:
{{{additionalContext}}}

Please write a supportive, constructive, and personalized comment that reflects the student's performance and progress, highlighting strengths and areas for improvement based on the provided information. The comment should be suitable for a formal report card.`,
});

const aiCommentGenerationFlow = ai.defineFlow(
  {
    name: 'aiCommentGenerationFlow',
    inputSchema: AiCommentGenerationInputSchema,
    outputSchema: AiCommentGenerationOutputSchema,
  },
  async (input) => {
    const { output } = await aiCommentGenerationPrompt(input);
    return output!;
  }
);
