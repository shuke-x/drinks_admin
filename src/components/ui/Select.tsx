export const Select = ({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => <select className="input input--select" {...props}>{children}</select>;
