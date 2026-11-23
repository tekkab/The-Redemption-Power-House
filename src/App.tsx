import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Bell, CalendarDays, ChevronRight, Clock3, Facebook, Heart, Instagram, MapPin, Menu, MessageCircle, PlayCircle, Radio, ShieldCheck, X, Youtube } from 'lucide-react';
import { isSupabaseConfigured, supabase } from './lib/supabase';

type Notice = { id: string; title: string; body: string; category: string; created_at: string; event_date?: string | null; image_url?: string | null };
const fallbackNotices: Notice[] = [
  { id: 'welcome', title: 'Welcome to The Redemption Power House', body: 'Stay connected with church activities, announcements and ministry updates. Check this notice board regularly for the latest information.', category: 'Announcement', created_at: new Date().toISOString() },
];
const socials = [
  { label: 'Facebook', href: 'https://www.facebook.com/', Icon: Facebook },
  { label: 'YouTube', href: 'https://www.youtube.com/', Icon: Youtube },
  { label: 'Instagram', href: 'https://www.instagram.com/', Icon: Instagram },
];

export default function App() {
  const [notices, setNotices] = useState<Notice[]>(fallbackNotices);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState('Home');
  const [likes, setLikes] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('trph-likes') || '[]'); } catch { return []; } });
  const [adminOpen, setAdminOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.from('notices').select('id,title,body,category,created_at,event_date,image_url').eq('published', true).order('created_at', { ascending: false })
      .then(({ data }) => { if (data?.length) setNotices(data as Notice[]); });
  }, []);

  const toggleLike = (id: string) => {
    const next = likes.includes(id) ? likes.filter(x => x !== id) : [...likes, id];
    setLikes(next); localStorage.setItem('trph-likes', JSON.stringify(next));
  };

  const requestAdminLink = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) { setMessage('Supabase connection is not configured yet.'); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    setMessage(error ? error.message : 'Check your email for your secure sign-in link. Only authorised administrators can access the dashboard.');
    setLoading(false);
  };

  const nav = ['Home', 'Activities', 'Announcements', 'Weekly Message', 'Giving'];
  const scrollTo = (id: string, label: string) => { setActive(label); setMenuOpen(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

  return <div className="site-shell">
    <div className="topline"><span><MapPin size={13}/> Super House, Manyanja Road, Nairobi</span><span className="topline-right">A place of prayer, worship and transformation</span></div>
    <header className="header">
      <a className="brand" href="#home" onClick={() => setActive('Home')}><span className="brand-mark">TR<span>PH</span></span><span className="brand-copy"><b>THE REDEMPTION</b><strong>POWER HOUSE</strong><small>RAISING A PEOPLE OF POWER</small></span></a>
      <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X/> : <Menu/>}</button>
      <nav className={menuOpen ? 'nav open' : 'nav'}>{nav.map(n => <button key={n} className={active === n ? 'nav-link active' : 'nav-link'} onClick={() => scrollTo(n === 'Home' ? 'home' : n.toLowerCase().replace(' ', '-'), n)}>{n}</button>)}<button className="admin-link" onClick={() => setAdminOpen(true)}><ShieldCheck size={15}/> Admin</button></nav>
    </header>

    <main>
      <section className="hero" id="home">
        <div className="hero-glow"></div><div className="hero-content">
          <div className="eyebrow"><span></span> WELCOME TO OUR CHURCH FAMILY</div>
          <h1>THE REDEMPTION<br/><em>POWER HOUSE</em></h1>
          <p>A home of faith, fellowship and the transforming power of God.</p>
          <div className="hero-actions"><button className="gold-button" onClick={() => scrollTo('activities','Activities')}>Explore Church Life <ChevronRight size={17}/></button><a className="outline-button" href="https://trphministries.org/" target="_blank" rel="noreferrer">Visit Our Website</a></div>
        </div>
        <div className="hero-side"><span className="vertical-word">FAITH · WORSHIP · PURPOSE</span><div className="hero-seal">TRPH<span>✦</span></div></div>
        <div className="hero-foot"><span>NAIROBI, KENYA</span><span>YEAR OF OPEN HEAVENS · EZEKIEL 1:1</span></div>
      </section>

      <section className="quick-strip"><div><CalendarDays/><span><b>Sunday Main Service</b><small>10:00 AM – 1:00 PM</small></span></div><div><Radio/><span><b>Wednesday Bible Study</b><small>6:00 PM – 8:00 PM</small></span></div><div><Bell/><span><b>Friday Power Night</b><small>5:00 PM – 7:30 PM</small></span></div></section>

      <section className="section" id="activities"><div className="section-heading"><div><span className="eyebrow red">STAY CONNECTED</span><h2>Church <em>Activities</em></h2></div><p>Be part of what God is doing in our church community.</p></div><div className="notice-grid">{notices.filter(n => n.category.toLowerCase().includes('activ') || n.category.toLowerCase().includes('event')).map(n => <NoticeCard key={n.id} notice={n} liked={likes.includes(n.id)} onLike={() => toggleLike(n.id)}/>)}{notices.filter(n => n.category.toLowerCase().includes('activ') || n.category.toLowerCase().includes('event')).length === 0 && <div className="empty-state"><CalendarDays/><b>Church activities will appear here</b><span>Check back for upcoming services, meetings and special events.</span></div>}</div></section>

      <section className="section soft" id="announcements"><div className="section-heading"><div><span className="eyebrow red">WHAT'S HAPPENING</span><h2>Latest <em>Announcements</em></h2></div><p>Important updates and news from the church.</p></div><div className="notice-grid">{notices.filter(n => !n.category.toLowerCase().includes('activ') && !n.category.toLowerCase().includes('event') && !n.category.toLowerCase().includes('message')).map(n => <NoticeCard key={n.id} notice={n} liked={likes.includes(n.id)} onLike={() => toggleLike(n.id)}/>)}</div></section>

      <section className="message-section" id="weekly-message"><div className="message-art"><div className="message-ring">THE WORD<br/><b>OF GOD</b><span>✦</span></div></div><div className="message-copy"><span className="eyebrow">SPIRITUAL NOURISHMENT</span><h2>Weekly Message<br/><em>from Dad</em></h2><h3>Rev. Prosper Lanya</h3><p>Be strengthened and encouraged through the weekly teaching and messages from our spiritual father.</p><a href="https://www.youtube.com/" target="_blank" rel="noreferrer" className="watch-link"><PlayCircle/> Watch / Listen to Messages <ChevronRight/></a></div></section>

      <section className="section giving" id="giving"><div className="giving-copy"><span className="eyebrow red">PARTNER WITH THE VISION</span><h2>Giving &amp; <em>Tithes</em></h2><p>Your giving supports the work of ministry and helps us reach more lives. Use the church's official payment instructions below or contact the church office for verified details.</p><div className="giving-note"><ShieldCheck/><span><b>Give securely</b><small>We will publish verified bank and M-PESA details here once supplied by church leadership.</small></span></div></div><div className="giving-card"><span className="giving-star">✦</span><h3>Give with a cheerful heart</h3><p>“God loves a cheerful giver.”</p><b>2 Corinthians 9:7</b><div className="gold-rule"></div><small>Bank • M-PESA • Special Giving</small></div></section>

      <section className="connect-section"><span className="eyebrow">STAY IN TOUCH</span><h2>Connect with <em>TRPH</em></h2><p>Follow the ministry and share in the life of our church.</p><div className="social-row">{socials.map(({label,href,Icon}) => <a key={label} href={href} target="_blank" rel="noreferrer"><Icon/><span>{label}</span><ChevronRight size={15}/></a>)}<a href="https://www.tiktok.com/" target="_blank" rel="noreferrer"><PlayCircle/><span>TikTok</span><ChevronRight size={15}/></a><a href="https://wa.me/" target="_blank" rel="noreferrer"><MessageCircle/><span>WhatsApp</span><ChevronRight size={15}/></a></div></section>
    </main>
    <footer><div className="footer-brand"><span className="brand-mark">TR<span>PH</span></span><b>THE REDEMPTION POWER HOUSE</b></div><span>© {new Date().getFullYear()} The Redemption Power House. All rights reserved.</span><a href="https://trphministries.org/" target="_blank" rel="noreferrer">trphministries.org</a></footer>

    {adminOpen && <div className="modal-backdrop" onClick={() => setAdminOpen(false)}><div className="admin-modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setAdminOpen(false)}><X/></button><span className="eyebrow red">AUTHORised ACCESS</span><h2>Administrator <em>Sign In</em></h2><p>Enter your authorised church administrator email. We’ll send a secure sign-in link.</p><form onSubmit={requestAdminLink}><label>Email address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required/><button className="gold-button full" disabled={loading}>{loading ? 'Sending…' : 'Send secure sign-in link'}</button></form>{message && <p className="form-message">{message}</p>}<small>Super Admin access is restricted to approved accounts.</small></div></div>}
    {!isSupabaseConfigured && <div className="setup-banner">Preview mode · Supabase connection will be enabled after credentials are added.</div>}
  </div>;
}

function NoticeCard({ notice, liked, onLike }: { notice: Notice; liked: boolean; onLike: () => void }) {
  return <article className="notice-card"><div className="notice-meta"><span>{notice.category}</span><small><Clock3 size={13}/> {new Date(notice.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</small></div><h3>{notice.title}</h3><p>{notice.body}</p>{notice.event_date && <div className="event-date"><CalendarDays size={15}/> {new Date(notice.event_date).toLocaleString('en-KE')}</div>}<button className={liked ? 'like-button liked' : 'like-button'} onClick={onLike}><Heart size={16} fill={liked ? 'currentColor' : 'none'}/>{liked ? 'Liked' : 'Like'}</button></article>;
}