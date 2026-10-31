import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard, BookOpen, FolderKanban, ListTodo, ShieldCheck,
  Users, Plus, Trash2, Check, Sun, Moon, LogOut, Search, Bell,
  Code2, ArrowRight, Megaphone, Menu, X, Brain, CalendarDays,
  FileText, Award, BarChart3, Upload, Download, Clock, Send,
  ChevronRight, GraduationCap
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend
} from "recharts";
import { supabase } from "./supabase";
import "./styles.css";

const NAV = [
  ["Overview", LayoutDashboard],
  ["Courses", BookOpen],
  ["Projects", FolderKanban],
  ["Tasks", ListTodo],
  ["Quizzes", Brain],
  ["Calendar", CalendarDays],
  ["Assignments", FileText],
  ["Certificates", Award],
  ["Analytics", BarChart3],
];

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [page, setPage] = useState("Overview");
  const [dark, setDark] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");

  const [courses, setCourses] = useState([]);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const [authMode, setAuthMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  const [modal, setModal] = useState("");
  const [form, setForm] = useState({});
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [submissionText, setSubmissionText] = useState({});
  const [feedbackText, setFeedbackText] = useState({});

  const isAdmin = profile?.role === "admin";

  const notify = (message) => {
    setNotice(message);
    setTimeout(() => setNotice(""), 3500);
  };

  const setField = (key, value) =>
    setForm((old) => ({ ...old, [key]: value }));

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (!data.session) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        if (!nextSession) {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) loadData();
  }, [session]);

  async function loadData() {
    setLoading(true);

    const results = await Promise.all([
      supabase.from("profiles").select("*").eq("id", session.user.id).single(),
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("projects").select("*").order("created_at", { ascending: false }),
      supabase.from("tasks").select("*").order("created_at", { ascending: false }),
      supabase.from("announcements").select("*").order("created_at", { ascending: false }),
      supabase.from("quizzes").select("*").order("created_at", { ascending: false }),
      supabase.from("quiz_attempts").select("*").order("created_at", { ascending: false }),
      supabase.from("calendar_events").select("*").order("event_date", { ascending: true }),
      supabase.from("assignments").select("*").order("due_date", { ascending: true }),
      supabase.from("assignment_submissions").select("*").order("created_at", { ascending: false }),
      supabase.from("certificates").select("*").order("created_at", { ascending: false }),
    ]);

    const [
      p, c, pr, t, a, q, at, ev, ass, sub, cert
    ] = results;

    if (p.data) setProfile(p.data);
    setCourses(c.data || []);
    setProjects(pr.data || []);
    setTasks(t.data || []);
    setAnnouncements(a.data || []);
    setQuizzes(q.data || []);
    setAttempts(at.data || []);
    setEvents(ev.data || []);
    setAssignments(ass.data || []);
    setSubmissions(sub.data || []);
    setCertificates(cert.data || []);

    if (p.data?.role === "admin") {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      setStudents(data || []);
    }

    setLoading(false);
  }

  async function signIn(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

    if (error) notify(error.message);
    else if (authMode === "signup") notify("Account created! Ab login karo.");
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setPage("Overview");
  }

  async function addTask() {
    if (!form.title?.trim()) return notify("Task ka title likho.");
    const { error } = await supabase.from("tasks").insert({
      title: form.title,
      description: form.description || "",
      user_id: session.user.id,
      completed: false
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Task added!");
    loadData();
  }

  async function toggleTask(task) {
    const { error } = await supabase.from("tasks")
      .update({ completed: !task.completed })
      .eq("id", task.id);
    if (error) return notify(error.message);
    loadData();
  }

  async function deleteRow(table, id) {
    if (!window.confirm("Kya tum sure ho?")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return notify(error.message);
    notify("Deleted successfully.");
    loadData();
  }

  async function addCourse() {
    const { error } = await supabase.from("courses").insert({
      title: form.title,
      description: form.description || "",
      created_by: session.user.id
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Course added!");
    loadData();
  }

  async function addProject() {
    const { error } = await supabase.from("projects").insert({
      title: form.title,
      description: form.description || "",
      created_by: session.user.id
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Project added!");
    loadData();
  }

  async function addAnnouncement() {
    const { error } = await supabase.from("announcements").insert({
      title: form.title,
      content: form.description || "",
      created_by: session.user.id
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Announcement published!");
    loadData();
  }

  async function createQuiz() {
    let questions;
    let answers;
    try {
      questions = JSON.parse(form.questions || "[]");
      answers = (form.answers || "").split(",").map((x) => Number(x.trim()));
      if (!Array.isArray(questions) || !questions.length) throw new Error();
      if (answers.length !== questions.length ||
          answers.some((n) => !Number.isInteger(n) || n < 0 || n > 3)) {
        return notify("Har question ke liye correct option 0, 1, 2 ya 3 likho.");
      }
      if (questions.some((q) => !q.question || !Array.isArray(q.options) || q.options.length !== 4)) {
        return notify("Har question mein question aur exactly 4 options hone chahiye.");
      }
    } catch {
      return notify("Questions ka JSON format check karo.");
    }

    const { data, error } = await supabase.from("quizzes")
      .insert({
        title: form.title,
        description: form.description || "",
        questions
      })
      .select()
      .single();

    if (error) return notify(error.message);

    const { error: keyError } = await supabase.from("quiz_answer_keys")
      .insert({ quiz_id: data.id, correct_answers: answers });

    if (keyError) {
      await supabase.from("quizzes").delete().eq("id", data.id);
      return notify(keyError.message);
    }

    setModal("");
    setForm({});
    notify("Quiz published!");
    loadData();
  }

  async function submitQuiz() {
    if (!selectedQuiz) return;
    const total = selectedQuiz.questions?.length || 0;
    if (Object.keys(quizAnswers).length !== total) {
      return notify("Pehle saare questions attempt karo.");
    }

    const answers = selectedQuiz.questions.map((_, i) => quizAnswers[i]);
    const { data, error } = await supabase.rpc("submit_quiz", {
      p_quiz_id: selectedQuiz.id,
      p_answers: answers
    });

    if (error) return notify(error.message);

    setQuizResult(data);
    notify("Quiz submitted!");
    loadData();
  }

  async function addEvent() {
    const { error } = await supabase.from("calendar_events").insert({
      title: form.title,
      description: form.description || "",
      event_date: form.event_date,
      created_by: session.user.id
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Event added!");
    loadData();
  }

  async function addAssignment() {
    const { error } = await supabase.from("assignments").insert({
      title: form.title,
      description: form.description || "",
      due_date: form.due_date
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Assignment created!");
    loadData();
  }

  async function submitAssignment(assignment) {
    const file = selectedFiles[assignment.id];
    const answer = submissionText[assignment.id] || "";
    if (!file && !answer.trim()) {
      return notify("Text answer ya PDF file attach karo.");
    }
    if (file && file.type !== "application/pdf") {
      return notify("Sirf PDF file allowed hai.");
    }
    if (file && file.size > 10 * 1024 * 1024) {
      return notify("PDF file 10MB se chhoti honi chahiye.");
    }

    let filePath = null;
    if (file) {
      filePath = `${session.user.id}/${assignment.id}_${Date.now()}.pdf`;
      const { error: uploadError } = await supabase.storage
        .from("assignments")
        .upload(filePath, file, {
          contentType: "application/pdf",
          upsert: false
        });
      if (uploadError) return notify(uploadError.message);
    }

    const { error } = await supabase.from("assignment_submissions").upsert({
      assignment_id: assignment.id,
      user_id: session.user.id,
      answer,
      file_path: filePath,
      status: "submitted"
    }, { onConflict: "assignment_id,user_id" });

    if (error) return notify(error.message);
    notify("Assignment submitted!");
    loadData();
  }

  async function openPdf(path) {
    const { data, error } = await supabase.storage
      .from("assignments")
      .createSignedUrl(path, 300);
    if (error) return notify(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function reviewSubmission(submission, status) {
    const { error } = await supabase.from("assignment_submissions")
      .update({
        status,
        feedback: feedbackText[submission.id] || ""
      })
      .eq("id", submission.id);

    if (error) return notify(error.message);
    notify("Submission reviewed.");
    loadData();
  }

  async function issueCertificate(student) {
    const code = `CV-${Date.now().toString(36).toUpperCase()}`;
    const { error } = await supabase.from("certificates").insert({
      user_id: student.id,
      title: form.title || "Certificate of Achievement",
      certificate_code: code
    });
    if (error) return notify(error.message);
    setModal("");
    setForm({});
    notify("Certificate issued!");
    loadData();
  }

  const myAttempts = attempts.filter((a) => a.user_id === session?.user?.id);
  const myCertificates = certificates.filter((c) => c.user_id === session?.user?.id);
  const mySubmissions = submissions.filter((s) => s.user_id === session?.user?.id);

  const filtered = (items) => items.filter((item) =>
    `${item.title || ""} ${item.description || ""}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const chartData = [
    { name: "Courses", total: courses.length },
    { name: "Projects", total: projects.length },
    { name: "Tasks", total: tasks.length },
    { name: "Quizzes", total: quizzes.length },
    { name: "Assignments", total: assignments.length }
  ];

  const quizChart = [
    { name: "Passed", value: myAttempts.filter((a) => a.total && a.score / a.total >= 0.7).length },
    { name: "Other", value: myAttempts.filter((a) => !a.total || a.score / a.total < 0.7).length }
  ];

  if (!session) {
    return (
      <div className="auth-page">
        <div className="auth-decoration decor-one" />
        <div className="auth-decoration decor-two" />
        <form className="auth-card" onSubmit={signIn}>
          <div className="brand-mark"><Code2 size={25} /></div>
          <p className="eyebrow">YOUR STUDENT TECH HUB</p>
          <h1>Welcome to <span>CodeVerse.</span></h1>
          <p className="muted">Learn, build and grow — all in one place.</p>
          {authMode === "signup" && (
            <label>Full name
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Your name" />
            </label>
          )}
          <label>Email address
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} placeholder="At least 6 characters" />
          </label>
          <button className="primary-btn full-btn" disabled={loading}>
            {loading ? "Please wait..." : authMode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={17} />
          </button>
          <p className="auth-switch">
            {authMode === "login" ? "New to CodeVerse?" : "Already have an account?"}
            <button type="button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
              {authMode === "login" ? "Create account" : "Sign in"}
            </button>
          </p>
        </form>
      </div>
    );
  }

  if (loading) return <div className="loading-screen"><div className="loader" />Loading CodeVerse...</div>;

  return (
    <div className={`app-shell ${dark ? "dark" : ""}`}>
      {sidebarOpen && <div className="mobile-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><Code2 size={22} /></div>
          <span>Code<span>Verse</span></span>
          <button className="mobile-close" onClick={() => setSidebarOpen(false)}><X /></button>
        </div>

        <p className="nav-label">WORKSPACE</p>
        <nav>
          {NAV.map(([name, Icon]) => (
            <button key={name} className={`nav-item ${page === name ? "active" : ""}`}
              onClick={() => { setPage(name); setSidebarOpen(false); }}>
              <Icon size={18} /> <span>{name}</span>
              {page === name && <span className="active-dot" />}
            </button>
          ))}
          {isAdmin && (
            <>
              <p className="nav-label admin-label">ADMINISTRATION</p>
              <button className={`nav-item ${page === "Admin" ? "active" : ""}`}
                onClick={() => { setPage("Admin"); setSidebarOpen(false); }}>
                <ShieldCheck size={18} /><span>Admin Panel</span>
              </button>
            </>
          )}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-mini">
            <div className="avatar">{(profile?.full_name || email)[0]?.toUpperCase()}</div>
            <div className="profile-mini-text">
              <strong>{profile?.full_name || "Student"}</strong>
              <small>{isAdmin ? "Administrator" : "Student"}</small>
            </div>
          </div>
          <button className="nav-item logout-btn" onClick={signOut}><LogOut size={18} /> Sign out</button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="mobile-menu" onClick={() => setSidebarOpen(true)}><Menu /></button>
            <div>
              <p className="eyebrow">STUDENT WORKSPACE</p>
              <h2>{page}</h2>
            </div>
          </div>
          <div className="topbar-actions">
            <div className="search-box">
              <Search size={17} />
              <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">
              {dark ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button className="icon-btn notification-btn" onClick={() => setPage("Calendar")}><Bell size={19} /></button>
          </div>
        </header>

        <div className="content">
          {page === "Overview" && (
            <>
              <section className="welcome-banner">
                <div>
                  <p className="eyebrow">YOUR LEARNING JOURNEY</p>
                  <h1>Keep building, {profile?.full_name?.split(" ")[0] || "Student"}.</h1>
                  <p>Small steps every day lead to big achievements.</p>
                  <button className="banner-btn" onClick={() => setPage("Courses")}>Explore courses <ArrowRight size={16} /></button>
                </div>
                <div className="banner-art"><Code2 size={100} strokeWidth={1.2} /></div>
              </section>

              <div className="stats-grid">
                <Stat icon={BookOpen} label="Courses" value={courses.length} color="purple" />
                <Stat icon={FolderKanban} label="Projects" value={projects.length} color="blue" />
                <Stat icon={ListTodo} label="My tasks" value={tasks.length} color="orange" />
                <Stat icon={Award} label="Certificates" value={myCertificates.length} color="green" />
              </div>

              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-heading"><div><h3>Learning overview</h3><p>Your CodeVerse activity</p></div><BarChart3 /></div>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" fill="#7657e8" radius={[7, 7, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </section>

                <section className="panel">
                  <div className="panel-heading"><div><h3>Announcements</h3><p>Latest updates</p></div><Megaphone /></div>
                  {announcements.slice(0, 4).map((a) => (
                    <div className="announcement-item" key={a.id}>
                      <span className="announcement-dot" />
                      <div><strong>{a.title}</strong><p>{a.content}</p></div>
                    </div>
                  ))}
                  {!announcements.length && <Empty text="No announcements yet." />}
                </section>
              </div>

              <div className="dashboard-grid lower-grid">
                <section className="panel">
                  <div className="panel-heading"><div><h3>My tasks</h3><p>Stay on top of your work</p></div><button className="small-add" onClick={() => { setForm({}); setModal("task"); }}><Plus size={16} /> Add</button></div>
                  {tasks.slice(0, 5).map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} />)}
                  {!tasks.length && <Empty text="No tasks added yet." />}
                </section>
                <section className="panel">
                  <div className="panel-heading"><div><h3>Upcoming events</h3><p>What's coming up</p></div><CalendarDays /></div>
                  {events.slice(0, 4).map((e) => <EventRow key={e.id} event={e} />)}
                  {!events.length && <Empty text="No upcoming events." />}
                </section>
              </div>
            </>
          )}

          {page === "Courses" && (
            <Collection title="Courses" subtitle="Explore your learning resources" items={filtered(courses)} icon={BookOpen}
              admin={isAdmin} onAdd={() => { setForm({}); setModal("course"); }}
              onDelete={(id) => deleteRow("courses", id)} />
          )}

          {page === "Projects" && (
            <Collection title="Projects" subtitle="Build practical skills through projects" items={filtered(projects)} icon={FolderKanban}
              admin={isAdmin} onAdd={() => { setForm({}); setModal("project"); }}
              onDelete={(id) => deleteRow("projects", id)} />
          )}

          {page === "Tasks" && (
            <section className="panel page-panel">
              <div className="section-heading"><div><h3>My tasks</h3><p>Organise your daily learning goals.</p></div><button className="primary-btn" onClick={() => { setForm({}); setModal("task"); }}><Plus size={17} /> New task</button></div>
              {tasks.map((t) => <TaskRow key={t.id} task={t} onToggle={toggleTask} onDelete={() => deleteRow("tasks", t.id)} />)}
              {!tasks.length && <Empty text="Your task list is empty." />}
            </section>
          )}

          {page === "Quizzes" && (
            <section className="page-section">
              <div className="section-heading"><div><h3>Knowledge arena</h3><p>Test what you've learned with interactive quizzes.</p></div>
                {isAdmin && <button className="primary-btn" onClick={() => { setForm({}); setModal("quiz"); }}><Plus size={17} /> Create quiz</button>}
              </div>
              {selectedQuiz ? (
                <section className="panel quiz-panel">
                  <button className="text-btn" onClick={() => { setSelectedQuiz(null); setQuizResult(null); setQuizAnswers({}); }}>← Back to quizzes</button>
                  <h2>{selectedQuiz.title}</h2><p className="muted">{selectedQuiz.description}</p>
                  {quizResult ? (
                    <div className="quiz-result">
                      <div className="result-icon"><Award size={38} /></div>
                      <h2>{quizResult.score} / {quizResult.total}</h2>
                      <p>{quizResult.total && quizResult.score / quizResult.total >= 0.7 ? "Excellent work! You passed this quiz." : "Good attempt! Keep practising."}</p>
                      <button className="primary-btn" onClick={() => { setSelectedQuiz(null); setQuizResult(null); setQuizAnswers({}); }}>Done</button>
                    </div>
                  ) : (
                    <>
                      {selectedQuiz.questions?.map((q, i) => (
                        <div className="question-card" key={i}>
                          <p className="question-number">QUESTION {i + 1}</p>
                          <h3>{q.question}</h3>
                          <div className="option-list">
                            {q.options.map((option, j) => (
                              <button key={j} className={`quiz-option ${quizAnswers[i] === j ? "chosen" : ""}`}
                                onClick={() => setQuizAnswers((old) => ({ ...old, [i]: j }))}>
                                <span>{String.fromCharCode(65 + j)}</span>{option}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <button className="primary-btn" onClick={submitQuiz}><Send size={16} /> Submit quiz</button>
                    </>
                  )}
                </section>
              ) : (
                <div className="card-grid">
                  {filtered(quizzes).map((q) => (
                    <div className="feature-card" key={q.id}>
                      <div className="feature-icon purple"><Brain /></div>
                      <h3>{q.title}</h3><p>{q.description || "Test your knowledge."}</p>
                      <div className="card-footer"><span>{q.questions?.length || 0} questions</span>
                        <button className="text-btn" onClick={() => { setSelectedQuiz(q); setQuizAnswers({}); setQuizResult(null); }}>Start quiz <ArrowRight size={15} /></button>
                      </div>
                      {isAdmin && <button className="delete-link" onClick={() => deleteRow("quizzes", q.id)}><Trash2 size={14} /> Delete</button>}
                    </div>
                  ))}
                  {!quizzes.length && <Empty text="No quizzes available yet." />}
                </div>
              )}
            </section>
          )}

          {page === "Calendar" && (
            <section className="page-section">
              <div className="section-heading"><div><h3>Events calendar</h3><p>Keep track of important college dates and events.</p></div>
                {isAdmin && <button className="primary-btn" onClick={() => { setForm({}); setModal("event"); }}><Plus size={17} /> Add event</button>}
              </div>
              <div className="event-list">
                {filtered(events).map((event) => <EventRow key={event.id} event={event} admin={isAdmin} onDelete={() => deleteRow("calendar_events", event.id)} />)}
                {!events.length && <Empty text="No events scheduled." />}
              </div>
            </section>
          )}

          {page === "Assignments" && (
            <section className="page-section">
              <div className="section-heading"><div><h3>Assignments</h3><p>Submit your work as text or PDF documents.</p></div>
                {isAdmin && <button className="primary-btn" onClick={() => { setForm({}); setModal("assignment"); }}><Plus size={17} /> Create assignment</button>}
              </div>
              <div className="assignment-list">
                {filtered(assignments).map((a) => {
                  const mine = mySubmissions.find((s) => s.assignment_id === a.id);
                  return (
                    <div className="panel assignment-card" key={a.id}>
                      <div className="assignment-top">
                        <div className="feature-icon blue"><FileText /></div>
                        <div className="assignment-info"><h3>{a.title}</h3><p>{a.description}</p>
                          <small><Clock size={13} /> Due: {a.due_date || "No due date"}</small>
                        </div>
                        {isAdmin && <button className="icon-btn danger" onClick={() => deleteRow("assignments", a.id)}><Trash2 size={17} /></button>}
                      </div>
                      {isAdmin ? (
                        <p className="muted">Submissions received: {submissions.filter((s) => s.assignment_id === a.id).length}</p>
                      ) : (
                        <div className="submission-area">
                          {mine && <span className={`status-pill ${mine.status}`}>{mine.status}</span>}
                          <textarea placeholder="Write your answer (optional if PDF attached)" value={submissionText[a.id] ?? mine?.answer ?? ""}
                            onChange={(e) => setSubmissionText((old) => ({ ...old, [a.id]: e.target.value }))} />
                          <label className="upload-control"><Upload size={16} />
                            {selectedFiles[a.id]?.name || "Attach PDF (max 10MB)"}
                            <input type="file" accept="application/pdf,.pdf" onChange={(e) => setSelectedFiles((old) => ({ ...old, [a.id]: e.target.files?.[0] || null }))} />
                          </label>
                          <button className="primary-btn" onClick={() => submitAssignment(a)}><Send size={16} /> Submit assignment</button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {!assignments.length && <Empty text="No assignments posted yet." />}
              </div>

              {isAdmin && (
                <section className="panel review-panel">
                  <h3>Student submissions</h3>
                  {submissions.map((s) => {
                    const assignment = assignments.find((a) => a.id === s.assignment_id);
                    const student = students.find((u) => u.id === s.user_id);
                    return (
                      <div className="review-row" key={s.id}>
                        <div><strong>{student?.full_name || student?.email || "Student"}</strong><p>{assignment?.title || "Assignment"} · {s.status}</p>
                          {s.answer && <p className="answer-preview">{s.answer}</p>}
                          {s.file_path && <button className="text-btn" onClick={() => openPdf(s.file_path)}><Download size={14} /> View PDF</button>}
                        </div>
                        <div className="review-actions">
                          <input placeholder="Feedback" value={feedbackText[s.id] ?? s.feedback ?? ""} onChange={(e) => setFeedbackText((old) => ({ ...old, [s.id]: e.target.value }))} />
                          <button className="small-add" onClick={() => reviewSubmission(s, "approved")}><Check size={14} /> Approve</button>
                          <button className="small-danger" onClick={() => reviewSubmission(s, "revision")}>Revision</button>
                        </div>
                      </div>
                    );
                  })}
                  {!submissions.length && <Empty text="No submissions received." />}
                </section>
              )}
            </section>
          )}

          {page === "Certificates" && (
            <section className="page-section">
              <div className="section-heading"><div><h3>My certificates</h3><p>Your achievements in one place.</p></div></div>
              <div className="card-grid">
                {myCertificates.map((c) => (
                  <div className="certificate-card" key={c.id}>
                    <Award size={38} />
                    <p className="eyebrow">CODEVERSE ACHIEVEMENT</p>
                    <h2>{c.title}</h2>
                    <p>Presented to {profile?.full_name || "Student"}</p>
                    <small>Certificate ID: {c.certificate_code}</small>
                    <small>{new Date(c.created_at).toLocaleDateString()}</small>
                  </div>
                ))}
                {!myCertificates.length && <Empty text="Your certificates will appear here when earned or issued." />}
              </div>
            </section>
          )}

          {page === "Analytics" && (
            <section className="page-section">
              <div className="section-heading"><div><h3>Learning analytics</h3><p>A snapshot of your learning progress.</p></div></div>
              <div className="stats-grid">
                <Stat icon={Brain} label="Quiz attempts" value={myAttempts.length} color="purple" />
                <Stat icon={Award} label="Certificates" value={myCertificates.length} color="green" />
                <Stat icon={Check} label="Completed tasks" value={tasks.filter((t) => t.completed).length} color="blue" />
                <Stat icon={FileText} label="Submitted work" value={mySubmissions.length} color="orange" />
              </div>
              <div className="dashboard-grid">
                <section className="panel chart-panel"><div className="panel-heading"><div><h3>Platform content</h3><p>Available learning resources</p></div></div>
                  <div className="chart-wrap"><ResponsiveContainer width="100%" height={270}><BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                    <Bar dataKey="total" fill="#7657e8" radius={[7, 7, 0, 0]} />
                  </BarChart></ResponsiveContainer></div>
                </section>
                <section className="panel chart-panel"><div className="panel-heading"><div><h3>Quiz performance</h3><p>Your pass and practice attempts</p></div></div>
                  <div className="chart-wrap"><ResponsiveContainer width="100%" height={270}><PieChart>
                    <Pie data={quizChart} dataKey="value" nameKey="name" outerRadius={85} label>
                      <Cell fill="#24b47e" /><Cell fill="#7657e8" />
                    </Pie><Tooltip /><Legend />
                  </PieChart></ResponsiveContainer></div>
                </section>
              </div>
            </section>
          )}

          {page === "Admin" && isAdmin && (
            <section className="page-section">
              <div className="section-heading"><div><h3>Admin control centre</h3><p>Manage learning content and students.</p></div></div>
              <div className="stats-grid">
                <Stat icon={Users} label="Students" value={students.length} color="purple" />
                <Stat icon={BookOpen} label="Courses" value={courses.length} color="blue" />
                <Stat icon={FolderKanban} label="Projects" value={projects.length} color="orange" />
                <Stat icon={FileText} label="Submissions" value={submissions.length} color="green" />
              </div>
              <div className="admin-actions">
                <button onClick={() => { setForm({}); setModal("course"); }}><BookOpen /> Add course <Plus /></button>
                <button onClick={() => { setForm({}); setModal("project"); }}><FolderKanban /> Add project <Plus /></button>
                <button onClick={() => { setForm({}); setModal("announcement"); }}><Megaphone /> Announcement <Plus /></button>
                <button onClick={() => { setForm({}); setModal("quiz"); }}><Brain /> Create quiz <Plus /></button>
                <button onClick={() => { setForm({}); setModal("event"); }}><CalendarDays /> Add event <Plus /></button>
                <button onClick={() => { setForm({}); setModal("assignment"); }}><FileText /> Assignment <Plus /></button>
              </div>
              <section className="panel students-panel">
                <div className="panel-heading"><div><h3>Registered users</h3><p>Issue certificates to students</p></div><Users /></div>
                {students.map((student) => (
                  <div className="student-row" key={student.id}>
                    <div className="avatar">{(student.full_name || student.email || "S")[0].toUpperCase()}</div>
                    <div className="student-info"><strong>{student.full_name || "Student"}</strong><small>{student.email}</small></div>
                    <span className="role-tag">{student.role || "student"}</span>
                    {student.role !== "admin" && <button className="small-add" onClick={() => { setForm({ title: "Certificate of Achievement" }); setModal(`certificate:${student.id}`); }}><Award size={14} /> Certificate</button>}
                  </div>
                ))}
              </section>
            </section>
          )}
        </div>
      </main>

      {modal && (
        <div className="modal-backdrop" onClick={() => setModal("")}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setModal("")}><X /></button>
            <p className="eyebrow">CODEVERSE ADMIN / WORKSPACE</p>
            <h2>{modal.startsWith("certificate:") ? "Issue certificate" : ({
              task: "Create task", course: "Add course", project: "Add project",
              announcement: "New announcement", quiz: "Create quiz",
              event: "Add calendar event", assignment: "Create assignment"
            })[modal] || "Create new item"}</h2>

            {modal === "quiz" ? (
              <>
                <label>Quiz title<input value={form.title || ""} onChange={(e) => setField("title", e.target.value)} placeholder="e.g. JavaScript Basics" /></label>
                <label>Description<input value={form.description || ""} onChange={(e) => setField("description", e.target.value)} placeholder="Short description" /></label>
                <label>Questions JSON
                  <textarea className="json-input" value={form.questions || ""} onChange={(e) => setField("questions", e.target.value)} placeholder={'[{"question":"What does HTML stand for?","options":["Hyper Text Markup Language","High Text Machine Language","Home Tool Markup Language","Hyperlinks Text Mode Language"]}]'} />
                </label>
                <label>Correct answers (0–3, comma separated)<input value={form.answers || ""} onChange={(e) => setField("answers", e.target.value)} placeholder="0, 2, 1" /></label>
                <p className="hint">Option numbering 0 = A, 1 = B, 2 = C, 3 = D. Keep answer keys private.</p>
                <button className="primary-btn full-btn" onClick={createQuiz}>Publish quiz <ArrowRight size={16} /></button>
              </>
            ) : (
              <>
                {modal !== "certificate" && <label>Title<input value={form.title || ""} onChange={(e) => setField("title", e.target.value)} placeholder="Enter title" /></label>}
                {["course", "project", "announcement", "task", "event", "assignment"].includes(modal) &&
                  <label>Description<textarea value={form.description || ""} onChange={(e) => setField("description", e.target.value)} placeholder="Add details..." /></label>}
                {modal === "event" && <label>Event date<input type="date" value={form.event_date || ""} onChange={(e) => setField("event_date", e.target.value)} /></label>}
                {modal === "assignment" && <label>Due date<input type="date" value={form.due_date || ""} onChange={(e) => setField("due_date", e.target.value)} /></label>}
                <button className="primary-btn full-btn" onClick={() => {
                  if (modal.startsWith("certificate:")) {
                    const student = students.find((s) => s.id === modal.split(":")[1]);
                    if (student) issueCertificate(student);
                  } else ({
                    task: addTask, course: addCourse, project: addProject,
                    announcement: addAnnouncement, event: addEvent, assignment: addAssignment
                  })[modal]?.();
                }}>Save and publish <ArrowRight size={16} /></button>
              </>
            )}
          </div>
        </div>
      )}

      {notice && <div className="toast"><Check size={17} /> {notice}</div>}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }) {
  return <div className="stat-card"><div className={`stat-icon ${color}`}><Icon size={20} /></div><div><p>{label}</p><h2>{value}</h2></div></div>;
}

function Empty({ text }) {
  return <div className="empty-state"><div className="empty-icon"><Code2 size={23} /></div><p>{text}</p></div>;
}

function TaskRow({ task, onToggle, onDelete }) {
  return <div className={`task-row ${task.completed ? "task-done" : ""}`}>
    <button className={`check-circle ${task.completed ? "checked" : ""}`} onClick={() => onToggle(task)}><Check size={14} /></button>
    <div className="task-copy"><strong>{task.title}</strong>{task.description && <small>{task.description}</small>}</div>
    {onDelete && <button className="icon-btn danger" onClick={onDelete}><Trash2 size={16} /></button>}
  </div>;
}

function EventRow({ event, admin, onDelete }) {
  return <div className="event-row">
    <div className="date-tile"><strong>{event.event_date ? new Date(`${event.event_date}T00:00:00`).getDate() : "—"}</strong><small>{event.event_date ? new Date(`${event.event_date}T00:00:00`).toLocaleString("en", { month: "short" }) : "DATE"}</small></div>
    <div className="event-copy"><strong>{event.title}</strong><p>{event.description}</p></div>
    {admin && <button className="icon-btn danger" onClick={onDelete}><Trash2 size={16} /></button>}
  </div>;
}

function Collection({ title, subtitle, items, icon: Icon, admin, onAdd, onDelete }) {
  return <section className="page-section">
    <div className="section-heading"><div><h3>{title}</h3><p>{subtitle}</p></div>{admin && <button className="primary-btn" onClick={onAdd}><Plus size={17} /> Add {title.slice(0, -1)}</button>}</div>
    <div className="card-grid">
      {items.map((item) => <div className="feature-card" key={item.id}>
        <div className="feature-icon purple"><Icon /></div><h3>{item.title}</h3><p>{item.description || "Explore and learn more."}</p>
        <div className="card-footer"><span>CodeVerse resource</span>{admin && <button className="delete-link" onClick={() => onDelete(item.id)}><Trash2 size={14} /> Delete</button>}</div>
      </div>)}
      {!items.length && <Empty text={`No ${title.toLowerCase()} found.`} />}
    </div>
  </section>;
}

createRoot(document.getElementById("root")).render(<App />);