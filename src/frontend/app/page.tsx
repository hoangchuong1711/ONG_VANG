import Image from "next/image";
import Link from "next/link";

const steps = [
  { number: "01", title: "Tạo đơn", text: "Nhập địa chỉ lấy hàng, nơi giao và thông tin kiện hàng." },
  { number: "02", title: "Xem cước", text: "Kiểm tra cước dự kiến trước khi xác nhận đơn." },
  { number: "03", title: "Theo dõi", text: "Xem trạng thái đơn và hành trình giao hàng trong tài khoản." },
];

const questions = [
  {
    question: "Tôi có thể biết cước trước khi đặt đơn không?",
    answer: "Có. Sau khi nhập thông tin giao hàng, bạn có thể xem báo giá trước khi xác nhận tạo đơn.",
  },
  {
    question: "Làm sao để theo dõi đơn hàng?",
    answer: "Mở mục Đơn của tôi trong tài khoản, chọn đơn cần xem để theo dõi trạng thái và các mốc giao hàng.",
  },
  {
    question: "Tôi có thể thanh toán bằng cách nào?",
    answer: "Trang thanh toán của đơn hiển thị các lựa chọn hiện có, gồm tiền mặt và VNPay tùy theo trạng thái đơn.",
  },
  {
    question: "Nếu cần hỗ trợ về đơn hàng thì sao?",
    answer: "Bạn có thể mở chi tiết đơn để xem thông tin hiện tại và dùng mục hỗ trợ trên website khi cần trao đổi thêm.",
  },
];

const primaryButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-stone-950 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-stone-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-950";
const lightButton =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-stone-300 bg-white px-6 py-3 text-sm font-bold text-stone-900 transition-colors hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-stone-950";

function Brand() {
  return (
    <Link href="/" aria-label="Mini Ong Vàng, về trang chủ" className="inline-flex items-center gap-3 font-extrabold tracking-tight text-stone-950">
      <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500 text-stone-900 shadow-sm" aria-hidden="true">
        <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="7" className="fill-amber-400/80 stroke-stone-900" />
          <path d="M12 5v14" className="stroke-stone-900 stroke-[2.5]" />
          <path d="M8 8.5h8" className="stroke-stone-900 stroke-[2]" />
          <path d="M8 15.5h8" className="stroke-stone-900 stroke-[2]" />
          <path d="M7 6.5C5 4.5 4 6 5 8" className="stroke-stone-800" />
          <path d="M17 6.5C19 4.5 20 6 19 8" className="stroke-stone-800" />
          <circle cx="10" cy="11" r="0.8" className="fill-stone-900" />
          <circle cx="14" cy="11" r="0.8" className="fill-stone-900" />
        </svg>
      </span>
      <span className="text-lg sm:text-xl">Mini Ong Vàng</span>
    </Link>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-[100dvh] bg-[#FAFAF9] text-stone-950">
      <header className="relative z-20 border-b border-stone-200 bg-[#FAFAF9]/95">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-5 px-4 sm:px-6 lg:px-8">
          <Brand />
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 text-sm font-semibold text-stone-700 md:flex">
            <a href="#dich-vu" className="hover:text-stone-950">Dịch vụ</a>
            <a href="#cach-gui-hang" className="hover:text-stone-950">Cách gửi hàng</a>
            <a href="#hoi-dap" className="hover:text-stone-950">Hỏi đáp</a>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-bold text-stone-800 hover:bg-stone-100">Đăng nhập</Link>
            <Link href="/login?tab=register" className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-extrabold text-stone-950 transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950">Đăng ký</Link>
          </div>
          <details className="relative md:hidden">
            <summary className="cursor-pointer list-none rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold marker:content-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-950">Menu</summary>
            <nav aria-label="Điều hướng di động" className="absolute right-0 top-12 flex w-52 flex-col gap-1 rounded-xl border border-stone-200 bg-white p-2 text-sm font-semibold shadow-xl">
              <a href="#dich-vu" className="rounded-lg px-3 py-2 hover:bg-stone-100">Dịch vụ</a>
              <a href="#cach-gui-hang" className="rounded-lg px-3 py-2 hover:bg-stone-100">Cách gửi hàng</a>
              <a href="#hoi-dap" className="rounded-lg px-3 py-2 hover:bg-stone-100">Hỏi đáp</a>
              <Link href="/login" className="rounded-lg px-3 py-2 hover:bg-stone-100">Đăng nhập</Link>
              <Link href="/login?tab=register" className="rounded-lg bg-amber-400 px-3 py-2">Đăng ký</Link>
            </nav>
          </details>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl items-center gap-9 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12 lg:px-8 lg:py-20">
          <div className="max-w-xl">
            <p className="mb-6 inline-flex rounded-lg bg-amber-100 px-3 py-2 text-xs font-extrabold text-amber-900">Giao hàng nội thành cùng Mini Ong Vàng</p>
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.045em] sm:text-5xl lg:text-[4.2rem]">
              Gửi hàng dễ dàng. <span className="text-amber-600">Theo dõi rõ ràng.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-stone-600 sm:text-lg">
              Tạo đơn, xem cước dự kiến và theo dõi từng chặng giao hàng ở cùng một nơi.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/create-order" className={primaryButton}>Tạo đơn giao hàng <span className="ml-3" aria-hidden="true">↗</span></Link>
              <Link href="/orders" className={lightButton}>Xem đơn của tôi</Link>
            </div>
          </div>
          <div className="relative overflow-hidden rounded-[1.75rem] bg-amber-100 shadow-[0_24px_70px_-35px_rgba(68,47,14,0.5)]">
            <Image
              src="/images/giao-hang-noi-thanh.png"
              alt="Nhân viên giao hàng mặc áo vàng di chuyển trên xe máy trong thành phố"
              width={1536}
              height={1024}
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="aspect-[4/3] w-full object-cover object-[58%_center] lg:aspect-[5/4]"
            />
          </div>
        </section>

        <section id="dich-vu" className="border-y border-stone-200 bg-white scroll-mt-20">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Mọi thông tin cần thiết, ngay trong từng đơn hàng.</h2>
            <div className="mt-11 grid gap-9 md:grid-cols-3 md:gap-12">
              <div className="border-l-4 border-amber-400 pl-5">
                <h3 className="text-lg font-extrabold">Biết cước trước khi gửi</h3>
                <p className="mt-3 leading-7 text-stone-600">Nhập điểm lấy, điểm giao và thông tin kiện hàng để xem báo giá trước khi xác nhận.</p>
              </div>
              <div className="border-l-4 border-amber-400 pl-5">
                <h3 className="text-lg font-extrabold">Nắm tiến độ giao hàng</h3>
                <p className="mt-3 leading-7 text-stone-600">Xem trạng thái, các mốc vận chuyển và chi tiết của đơn ngay trên website.</p>
              </div>
              <div className="border-l-4 border-amber-400 pl-5">
                <h3 className="text-lg font-extrabold">Quản lý đơn gọn gàng</h3>
                <p className="mt-3 leading-7 text-stone-600">Truy cập đơn đang giao, đơn đã hoàn tất và thông tin thanh toán tại một nơi.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="cach-gui-hang" className="scroll-mt-20 bg-amber-50/60">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <h2 className="max-w-2xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">Ba bước để bắt đầu gửi hàng</h2>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {steps.map((step) => (
                <div key={step.number} className="rounded-2xl border border-amber-200/80 bg-white p-7 shadow-sm">
                  <span className="text-3xl font-extrabold text-amber-600">{step.number}</span>
                  <h3 className="mt-8 text-xl font-extrabold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-stone-600">{step.text}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 rounded-2xl border border-amber-200 bg-white px-6 py-5 sm:px-7">
              <h3 className="text-base font-extrabold text-stone-950">Chuẩn bị trước khi tạo đơn</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">Hãy có sẵn địa chỉ lấy hàng, số điện thoại người nhận và thông tin kiện hàng để nhập đơn nhanh hơn.</p>
            </div>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
            <div>
              <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">Tài khoản của bạn, mọi đơn hàng của bạn.</h2>
              <p className="mt-4 max-w-2xl leading-7 text-stone-600">Đăng ký bằng số điện thoại để tạo đơn và xem lại lịch sử giao hàng thuận tiện hơn.</p>
            </div>
            <Link href="/login?tab=register" className={primaryButton}>Đăng ký tài khoản <span className="ml-3" aria-hidden="true">↗</span></Link>
          </div>
        </section>

        <section id="hoi-dap" className="scroll-mt-20 border-t border-stone-200 bg-[#FAFAF9]">
          <div className="mx-auto grid max-w-7xl gap-9 px-4 py-16 sm:px-6 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20 lg:px-8 lg:py-24">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Câu hỏi thường gặp</h2>
              <p className="mt-4 leading-7 text-stone-600">Tìm câu trả lời nhanh trước khi gửi đơn đầu tiên.</p>
            </div>
            <div className="space-y-3">
              {questions.map(({ question, answer }) => (
                <details key={question} className="group rounded-xl border border-stone-200 bg-white p-5 open:border-amber-300">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-bold marker:content-none">
                    {question}<span className="text-xl leading-5 text-amber-700 group-open:rotate-45" aria-hidden="true">+</span>
                  </summary>
                  <p className="mt-4 pr-6 leading-7 text-stone-600">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-amber-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:gap-12 lg:px-8 lg:py-16">
          <div className="max-w-sm">
            <Brand />
            <p className="mt-5 text-sm leading-7 text-stone-600">Tạo đơn, xem cước dự kiến và theo dõi tiến độ giao hàng trên cùng một website.</p>
          </div>

          <nav aria-label="Tìm hiểu dịch vụ">
            <h3 className="mb-4 text-sm font-extrabold text-stone-950">Tìm hiểu</h3>
            <ul className="space-y-3 text-sm text-stone-600">
              <li><a href="#dich-vu" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Dịch vụ</a></li>
              <li><a href="#cach-gui-hang" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Cách gửi hàng</a></li>
              <li><a href="#hoi-dap" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Câu hỏi thường gặp</a></li>
            </ul>
          </nav>

          <nav aria-label="Quản lý đơn hàng">
            <h3 className="mb-4 text-sm font-extrabold text-stone-950">Đơn hàng</h3>
            <ul className="space-y-3 text-sm text-stone-600">
              <li><Link href="/create-order" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Tạo đơn giao hàng</Link></li>
              <li><Link href="/orders" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Đơn của tôi</Link></li>
              <li><Link href="/customer" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Tổng quan khách hàng</Link></li>
            </ul>
          </nav>

          <nav aria-label="Tài khoản">
            <h3 className="mb-4 text-sm font-extrabold text-stone-950">Tài khoản</h3>
            <ul className="space-y-3 text-sm text-stone-600">
              <li><Link href="/login?tab=register" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Đăng ký</Link></li>
              <li><Link href="/login" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Đăng nhập</Link></li>
              <li><Link href="/account" className="rounded-sm hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Hồ sơ khách hàng</Link></li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-stone-200">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <span>© Mini Ong Vàng. Giao hàng thuận tiện hơn mỗi ngày.</span>
            <a href="#hoi-dap" className="w-fit rounded-sm font-semibold text-stone-700 hover:text-amber-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">Cần hỗ trợ? Xem câu hỏi thường gặp</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
