# Email Generation Prompts

This folder contains the prompts used by the OpenAI service to generate email content and HTML.

## Prompt Files

- **email_content_generation.md** - Generates email copy (subject, body, CTA, etc.) with Mapp placeholders
- **email_html_generation.md** - Converts email content into responsive HTML with inline CSS

## Prompt File Format

Each prompt file follows this structure:

```markdown
# Prompt Title

## System Prompt

The main instruction for the AI. This defines the AI's role and requirements.
Can be multiple paragraphs.

## User Prompt Template (optional)

Template for the user message with {{variable}} placeholders.
Supports:
- {{variableName}} - Simple variable replacement
- {{#if variableName}}...{{/if}} - Conditional blocks

## Settings

- Model: gpt-4o
- Temperature: 0.7
- Response Format: JSON (optional)
```

## How to Edit Prompts

1. **Edit System Prompt**: Modify the instructions, tone, requirements
2. **Adjust Temperature**:
   - Lower (0.1-0.4) = More focused and deterministic
   - Medium (0.5-0.7) = Balanced creativity
   - Higher (0.8-1.0) = More creative and varied
3. **Change Model**: Switch between gpt-4o, gpt-4-turbo, etc.
4. **Modify Variables**: Add or remove placeholders in User Prompt Template

## Example: Making Emails More Casual

Edit `email_content_generation.md`:

```markdown
## System Prompt

You are a friendly email marketing copywriter who writes in a casual, conversational tone...

- Use contractions (don't, won't, you'll)
- Write like you're talking to a friend
- Keep sentences short and punchy
```

## Example: Adding Mapp Placeholder Support

To suggest more Mapp placeholders, add to the system prompt:

```markdown
Available Mapp placeholders include:
- {{user.firstname}}, {{user.lastname}}, {{user.email}}
- {{product.name}}, {{product.price}}, {{product.image}}
- {{company.name}}, {{company.phone}}
- {{voucher.code}}, {{voucher.discount}}
```

## Testing Changes

After editing prompts:
1. Restart the backend server
2. Generate a new email in the frontend
3. Check if the output matches your expectations
4. Iterate as needed

## Tips

- Be specific in your instructions
- Include examples in the system prompt for better results
- Test with various user prompts to ensure consistency
- Keep the JSON structure intact for content generation
