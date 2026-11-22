import { useState } from 'react';
import { Mail, User, Send, CheckCircle2 } from 'lucide-react';
import { sendContactMessage } from '../services/examService.js';
import { TextField, FormField } from '../components/common/Fields.jsx';
import Button from '../components/common/Button.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { isValidEmail } from '../utils/validators.js';
import { friendlyError } from '../utils/errors.js';

const EMPTY = { name: '', email: '', subject: '', message: '' };

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (key) => (event) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    if (!form.name.trim()) next.name = 'Please enter your name.';
    if (!isValidEmail(form.email)) next.email = 'Please enter a valid email address.';
    if (form.message.trim().length < 5) next.message = 'Please write a message (at least 5 characters).';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSending(true);
    try {
      await sendContactMessage(form);
      setSent(true);
      setForm(EMPTY);
      toast.success('Message sent. Thank you for contacting us!');
    } catch (err) {
      toast.error(friendlyError(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="container section">
      <div className="page-head">
        <h1 className="page-head__title">Contact us</h1>
        <p className="page-head__text">Questions, feedback or suggestions? Send us a message.</p>
      </div>

      <div className="narrow">
        {sent ? (
          <div className="panel panel--center">
            <CheckCircle2 size={44} className="text-success" aria-hidden="true" />
            <h2 className="panel__title">Message received</h2>
            <p className="muted">Thank you! We will read your message as soon as possible.</p>
            <Button variant="outline" onClick={() => setSent(false)}>
              Send another message
            </Button>
          </div>
        ) : (
          <form className="panel form" onSubmit={submit} noValidate>
            <TextField id="c-name" label="Your name" icon={User} value={form.name} onChange={set('name')} error={errors.name} maxLength={120} autoComplete="name" />
            <TextField id="c-email" label="Email address" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} maxLength={200} autoComplete="email" />
            <TextField id="c-subject" label="Subject (optional)" value={form.subject} onChange={set('subject')} maxLength={200} />
            <FormField id="c-message" label="Message" error={errors.message}>
              <textarea
                id="c-message"
                className="input textarea"
                rows={6}
                value={form.message}
                onChange={set('message')}
                maxLength={4000}
                aria-invalid={Boolean(errors.message)}
              />
            </FormField>
            <Button type="submit" size="lg" icon={Send} loading={sending}>
              Send message
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
