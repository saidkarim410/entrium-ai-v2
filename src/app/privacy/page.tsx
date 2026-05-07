import Link from "next/link"
import { Sparkles } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Политика конфиденциальности · Entrium AI",
  description: "Как Entrium AI собирает, использует и защищает ваши данные.",
}

export default function PrivacyPage() {
  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-foreground text-background">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>Entrium AI</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 container max-w-3xl mx-auto px-4 py-12 lg:py-20">
        <h1 className="text-3xl font-semibold tracking-tight">Политика конфиденциальности</h1>
        <p className="mt-2 text-sm text-muted-foreground">Последнее обновление: 7 мая 2026</p>

        <div className="prose prose-zinc dark:prose-invert mt-10 space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">1. Кто мы</h2>
            <p>
              Entrium AI («мы», «нас», «сервис») — образовательная AI-платформа для помощи в поступлении в зарубежные университеты. Контакт: <a href="mailto:tursunbaev505@gmail.com" className="underline">tursunbaev505@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">2. Какие данные мы собираем</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Регистрационные данные:</strong> email, имя, аватар (при входе через Google).</li>
              <li><strong>Контент диалогов:</strong> сообщения, которые вы отправляете AI-инструментам.</li>
              <li><strong>Метаданные использования:</strong> количество запросов, выбранные инструменты, временные метки.</li>
              <li><strong>Технические данные:</strong> IP-адрес, тип устройства, браузер — для безопасности и аналитики.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">3. Как мы используем данные</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Предоставление AI-функций (анализ профиля, подбор университетов, эссе и др.).</li>
              <li>Подсчёт лимитов использования (5 запросов/день для Free, безлимит для Pro).</li>
              <li>Безопасность аккаунта и предотвращение злоупотреблений.</li>
              <li>Улучшение продукта (агрегированные данные, без персональной идентификации).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">4. С кем мы делимся данными</h2>
            <p>Мы передаём минимум необходимых данных следующим обработчикам:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Anthropic (Claude):</strong> текст ваших сообщений для генерации AI-ответов.</li>
              <li><strong>OpenAI:</strong> текст для создания эмбеддингов (поиск по университетам).</li>
              <li><strong>Supabase:</strong> хранение профиля, истории, токенов сессий.</li>
              <li><strong>Vercel:</strong> хостинг приложения.</li>
              <li><strong>Google (для OAuth):</strong> только если вы выбрали вход через Google.</li>
            </ul>
            <p className="mt-3">Мы <strong>не продаём</strong> ваши данные третьим лицам.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">5. Хранение данных</h2>
            <p>
              Данные хранятся пока активен ваш аккаунт. Вы можете удалить аккаунт в любой момент — это автоматически удалит профиль, историю запросов и подписки (cascade delete на уровне БД).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">6. Ваши права</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Запросить экспорт всех ваших данных.</li>
              <li>Удалить аккаунт и все связанные данные.</li>
              <li>Отозвать согласие на обработку.</li>
              <li>Подать жалобу в надзорный орган.</li>
            </ul>
            <p className="mt-3">Для запросов: <a href="mailto:tursunbaev505@gmail.com" className="underline">tursunbaev505@gmail.com</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">7. Cookies и сессии</h2>
            <p>
              Мы используем httpOnly cookies для аутентификации (Supabase Auth) — это технически необходимо. Аналитические cookies требуют вашего согласия (если будут добавлены).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">8. Безопасность</h2>
            <p>
              Все соединения через HTTPS (TLS 1.3). Пароли хешируются bcrypt. Данные хранятся в зашифрованном виде на серверах Supabase (AWS). Row Level Security (RLS) гарантирует, что пользователи видят только свои данные.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium tracking-tight mt-8">9. Изменения политики</h2>
            <p>
              При существенных изменениях мы уведомим вас по email или в интерфейсе сервиса минимум за 7 дней.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/40 py-8 mt-20">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:flex-row">
          <p>© 2026 Entrium AI</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
          </div>
        </div>
      </footer>
    </>
  )
}
