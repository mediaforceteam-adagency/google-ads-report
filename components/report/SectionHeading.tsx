export default function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[17px] font-bold text-[#1b5ea6] pb-3 border-b-2 border-[#dce6f5] mb-6 mt-10 first:mt-0">
      {children}
    </h2>
  )
}
