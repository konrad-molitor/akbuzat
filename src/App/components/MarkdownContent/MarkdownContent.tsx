import {useLayoutEffect, useRef} from "react";
import markdownit from "markdown-it";
import hljs from "highlight.js";
import classNames from "classnames";

const md = markdownit({
    highlight(str, lang): string {
        if (hljs.getLanguage(lang) != null) {
            try {
                return hljs.highlight(str, {language: lang}).value;
            } catch (err) {
                // do nothing
            }
        }

        return hljs.highlightAuto(str).value;
    }
});

export function MarkdownContent({children, inline = false, dir, className}: MarkdownContentProps) {
    const divRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (divRef.current == null)
            return;

        if (inline)
            divRef.current.innerHTML = md.renderInline(children ?? "");
        else
            divRef.current.innerHTML = md.render(children ?? "");
    }, [inline, children]);

    return <div
        className={classNames(
            "[&_pre>code]:block [&_pre>code]:bg-gray-100 dark:[&_pre>code]:bg-gray-800 [&_pre>code]:p-4 [&_pre>code]:rounded [&_pre>code]:text-sm [&_pre>code]:overflow-x-auto [&_pre>code]:select-all",
            "[&_h2]:my-4 [&_h2]:pt-6",
            "[&_h3]:mt-8 [&_h3]:mb-0",
            "[&_hr]:bg-gray-200 dark:[&_hr]:bg-gray-700 [&_hr]:h-0.5 [&_hr]:border-0 [&_hr]:rounded-xl",
            "[&_blockquote]:m-0 [&_blockquote]:ps-6 [&_blockquote]:opacity-64 [&_blockquote]:border-0 [&_blockquote]:relative [&_blockquote]:before:content-[''] [&_blockquote]:before:absolute [&_blockquote]:before:w-1 [&_blockquote]:before:h-full [&_blockquote]:before:bg-gray-200 dark:[&_blockquote]:before:bg-gray-700 [&_blockquote]:before:start-0",
            "[&_table]:block [&_table]:border-hidden [&_table]:rounded-xl [&_table]:outline [&_table]:outline-1 [&_table]:outline-gray-200 dark:[&_table]:outline-gray-700 [&_table]:outline-offset-[-1px] [&_table]:max-w-max [&_table]:border-collapse [&_table]:overflow-x-auto [&_table]:bg-white dark:[&_table]:bg-gray-900",
            "[&_thead]:text-justify",
            "[&_tr]:bg-transparent [&_tr]:border-t [&_tr]:border-gray-200 dark:[&_tr]:border-gray-700 [&_tr:nth-child(2n)_td]:bg-gray-50 dark:[&_tr:nth-child(2n)_td]:bg-gray-800",
            "[&_th]:bg-gray-50 dark:[&_th]:bg-gray-800 [&_th]:border [&_th]:border-gray-200 dark:[&_th]:border-gray-700 [&_th]:p-2 [&_th]:px-4",
            "[&_td]:border [&_td]:border-gray-200 dark:[&_td]:border-gray-700 [&_td]:p-2 [&_td]:px-4",
            className
        )}
        ref={divRef}
        dir={dir}
    />;
}

type MarkdownContentProps = {
    className?: string,
    inline?: boolean,
    dir?: string,
    children: string
};
