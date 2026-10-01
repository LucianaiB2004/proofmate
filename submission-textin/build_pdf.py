from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    PageBreak, Paragraph, SimpleDocTemplate, Spacer, Image, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "真源ProofMate-TextIn-xParse实用价值赛道说明书.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

font = Path(r"C:\Windows\Fonts\msyh.ttc")
bold = Path(r"C:\Windows\Fonts\msyhbd.ttc")
pdfmetrics.registerFont(TTFont("CN", str(font), subfontIndex=0))
pdfmetrics.registerFont(TTFont("CN-Bold", str(bold), subfontIndex=0))

PAGE_W, PAGE_H = A4
INK = colors.HexColor("#181A19")
RED = colors.HexColor("#C8322A")
TEAL = colors.HexColor("#168C7C")
PAPER = colors.HexColor("#F6F0E3")
MUTED = colors.HexColor("#6E6A61")

styles = getSampleStyleSheet()
title = ParagraphStyle("TitleCN", fontName="CN-Bold", fontSize=28, leading=36, textColor=INK, alignment=TA_CENTER, spaceAfter=10)
subtitle = ParagraphStyle("Sub", fontName="CN", fontSize=13, leading=20, textColor=MUTED, alignment=TA_CENTER)
h1 = ParagraphStyle("H1CN", fontName="CN-Bold", fontSize=20, leading=28, textColor=INK, spaceBefore=4, spaceAfter=12)
h2 = ParagraphStyle("H2CN", fontName="CN-Bold", fontSize=13, leading=20, textColor=RED, spaceBefore=8, spaceAfter=5)
body = ParagraphStyle("BodyCN", fontName="CN", fontSize=10.2, leading=17, textColor=INK, spaceAfter=8)
small = ParagraphStyle("SmallCN", fontName="CN", fontSize=8.4, leading=13, textColor=MUTED, spaceAfter=4)
quote = ParagraphStyle("QuoteCN", fontName="CN-Bold", fontSize=12, leading=20, textColor=TEAL, leftIndent=12, rightIndent=12, spaceBefore=6, spaceAfter=12)


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(PAPER)
    canvas.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)
    canvas.setStrokeColor(colors.HexColor("#D9D0BF"))
    canvas.line(18 * mm, 14 * mm, PAGE_W - 18 * mm, 14 * mm)
    canvas.setFont("CN", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 9 * mm, "真源 ProofMate｜TextIn xParse 实用价值赛道")
    canvas.drawRightString(PAGE_W - 18 * mm, 9 * mm, str(doc.page))
    canvas.restoreState()


def picture(path, max_w=165*mm, max_h=92*mm):
    img = Image(str(ROOT / path))
    ratio = min(max_w / img.imageWidth, max_h / img.imageHeight)
    img.drawWidth = img.imageWidth * ratio
    img.drawHeight = img.imageHeight * ratio
    return img


story = []
story += [Spacer(1, 28*mm), Paragraph("真源 ProofMate", title), Paragraph("文档证据审查台", title), Spacer(1, 5*mm)]
story += [Paragraph("TextIn xParse 实用价值赛道｜作品说明书", subtitle), Spacer(1, 12*mm)]
story += [Paragraph("给我你的项目材料，我帮你找出哪些结论有证据、哪些还需要补证。", quote)]
story += [picture("submission/作品展示/界面截图-首屏.png", 168*mm, 82*mm), Spacer(1, 6*mm)]
story += [Paragraph("TextIn xParse × Qwen × OpenVINO × 天猫 AI", subtitle), Paragraph("作者 LucianaiB｜2026.09", subtitle), PageBreak()]

story += [Paragraph("01｜作品介绍", h1)]
story += [Paragraph("场景与问题", h2), Paragraph("学生做答辩、科研立项或项目申报时，材料里常有许多“看起来合理”的结论，但结论背后的数据、出处和原文没有对齐。人工逐页翻找 PDF、扫描表格和图片，既慢，也容易把模型生成的判断误当成真实证据。真源 ProofMate 面向这一环节，把散落在材料里的主张、证据、冲突和待补项整理成一份可以逐条回查的档案。", body)]
story += [Paragraph("核心功能", h2), Paragraph("用户上传 PDF、图片或扫描件后，系统先读取材料正文；随后形成主张索引卡，为每条主张匹配支持证据或冲突证据，展示来源摘录、关联理由、评分组成与下一步补证建议。用户可以继续上传证据、进行本地分析或调用云端复核，确认后再写入档案。整个过程保留输入文件、提取方式和处理轨迹。", body)]
story += [Paragraph("创新点", h2), Paragraph("ProofMate 不把“模型说了什么”当成结论，而把“原文在哪里、为什么能支持、还缺什么”放在界面中心。系统把文字提取、模型审查、证据关系和人工确认拆成清晰环节：OCR 只负责读材料，模型只负责提出判断，最终结论必须能回到原文并由用户确认。评分也不是凭空给出，而由来源可定位性、摘录完整度、证据关系强度和冲突情况共同派生。", body)]
story += [picture("submission/作品展示/界面截图-证据驾驶舱.png", 165*mm, 100*mm), Paragraph("图 1｜主张索引、证据关系与风险说明同屏呈现", small), PageBreak()]

story += [Paragraph("02｜技术方案", h1)]
story += [Paragraph("四段式端云协同", h2)]
data = [
    [Paragraph("环节", small), Paragraph("技术", small), Paragraph("职责边界", small)],
    [Paragraph("材料读取", body), Paragraph("TextIn xParse / PDF.js", body), Paragraph("xParse 解析图片和扫描 PDF；文本型 PDF 在浏览器读取。只提取内容，不判断真假。", body)],
    [Paragraph("隐私初审", body), Paragraph("OpenVINO Qwen3-4B INT4", body), Paragraph("在本机梳理主张、风险与待补项，材料不必先发往云端。", body)],
    [Paragraph("按需复核", body), Paragraph("百炼 Qwen", body), Paragraph("只复核仍未解决的主张，返回结构化依据和建议。", body)],
    [Paragraph("证据闭环", body), Paragraph("ProofMate", body), Paragraph("统一清洗、合并、去重、评分并等待用户确认入档。", body)],
]
t = Table(data, colWidths=[27*mm, 47*mm, 92*mm], repeatRows=1)
t.setStyle(TableStyle([("FONTNAME", (0,0), (-1,-1), "CN"), ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#E7DECC")), ("GRID", (0,0), (-1,-1), 0.4, colors.HexColor("#B7AD9A")), ("VALIGN", (0,0), (-1,-1), "TOP"), ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 6), ("BOTTOMPADDING", (0,0), (-1,-1), 6)]))
story += [t, Spacer(1, 6*mm)]
story += [Paragraph("xParse 接入方式", h2), Paragraph("项目通过本机 Vite 代理调用官方 xparse-cli。前端把图片或扫描 PDF 发送到 /api/xparse/parse，本机代理在临时目录写入文件并执行 xparse-cli parse --api auto，读取生成的 Markdown 后返回前端，最后删除临时目录。App ID 与 Secret Code 只保存在本机设置文件或环境变量中，浏览器端不会读取明文密钥。", body)]
story += [Paragraph("真实调用证据", h2), Paragraph("2026-10-01，在 ProofMate 项目开发与接入验证过程中，通过 WorkBuddy 使用 NASA 挑战者号 O 形环风险图表完成两次真实解析：Markdown 视图墙钟耗时 3813 ms，JSON 结构化视图墙钟耗时 4230 ms，退出码均为 0。服务端返回 code 200、duration_ms 1689，并生成 1596 字节 Markdown 与 19569 字节 JSON。输出包含 O-RING、temperature、secondary seal 等关键信息；输入与输出均记录 SHA-256，可验证文件未被替换。", body), PageBreak()]

story += [Paragraph("使用 WorkBuddy 开发 ProofMate", h1)]
story += [Paragraph("在项目开发过程中，我们把官方 xparse-parse Skill 接入 WorkBuddy 项目空间，并让 WorkBuddy 阅读 ProofMate 现有代码、核对 xParse 接入链路、调用真实扫描材料、检查输出结果，再完成针对性的代码审查与文档整理。WorkBuddy 读取 Skill 说明后，使用 workbuddy profile 解析 NASA O 形环风险图表，生成 Markdown、JSON、调用记录和 ProofMate 项目说明。这里展示的是 ProofMate 的实际开发与验证过程，不是把 WorkBuddy 当作产品运行时功能。", body)]
story += [picture("submission-textin/evidence/workbuddy-screenshots/01-真实解析与产物预览.png", 168*mm, 105*mm), Paragraph("图 2｜ProofMate 开发过程中，WorkBuddy 调用 xparse-parse Skill、检查真实结果并生成开发产物", small), PageBreak()]

story += [Paragraph("03｜处理流程", h1)]
story += [Paragraph("输入类型", h2), Paragraph("系统支持文本文件、文本型 PDF、图片以及扫描 PDF。文本型 PDF 优先由 PDF.js 在浏览器提取，只有没有内嵌文字的扫描 PDF 与图片才调用 xParse，避免无意义 OCR。原文件、提取方式、提取结果都会在“原始材料与提取结果”区域中展示。", body)]
story += [Paragraph("任务链路", h2), Paragraph("① 用户上传材料；② 系统判断文件类型并提取文字；③ xParse 将视觉文档转成 Markdown；④ ProofMate 清洗 Markdown 与表格标签，定位候选主张；⑤ OpenVINO 本地模型先做主张、风险和待补项梳理；⑥ Qwen 按需复核仍未解决项；⑦ 系统把支持证据、冲突证据、原文摘录与来源绑定；⑧ 用户补证、确认并归档。多次复核只更新未解决主张，不会简单累加重复问题。", body)]
story += [Paragraph("提示与约束", h2), Paragraph("模型收到的是清洗后的正文以及明确的结构化输出要求：区分核心结论、风险项、下一步建议和证据摘录；不得把建议伪装成证据；无法定位原文时必须标记为待补证。OCR 结果可能有字符误识别，因此系统展示原始文件与提取文本，允许用户回看并人工校正。", body)]
story += [picture("submission/作品展示/界面截图-真实材料复核.png", 165*mm, 101*mm), Paragraph("图 3｜真实材料复核：来源、OCR/正文、主张和证据关系可回查", small), PageBreak()]

story += [Paragraph("04｜解决效果", h1)]
story += [Paragraph("从“聊天答案”变成“可追溯档案”", h2), Paragraph("传统使用方式通常把整份材料贴给模型，再获得一段难以回查的总结。ProofMate 把结果拆成主张卡、证据卡、冲突关系和补证动作。每条结论都有明确状态：已有支持、存在冲突、待补证或已确认；点击主张时只展示与该主张有关的证据，而不是重复一套通用说明。", body)]
story += [Paragraph("真实效率证据", h2), Paragraph("本次 xParse 样例的 Markdown 与 JSON 两次完整调用分别用时 3.813 秒和 4.230 秒，服务端解析自计时为 1.689 秒；配额账本从 0 页变为 2 页，与两次调用一一对应。OpenVINO 本地模型的既有实机测试中，首次加载为 18.14 秒，预热后的三次分析为 8.75、8.43、9.09 秒，中位数 8.75 秒。这里展示的是指定机器与指定样例的实测结果，不外推为所有设备的统一性能。", body)]
story += [Paragraph("质量与可信度", h2), Paragraph("xParse 输出成功识别了 O 形环、低温、次级密封等核心语义，但也出现少量英文拼写误识别。这恰好说明产品为什么必须保留原文预览和人工确认：OCR 负责让材料可检索，模型负责组织风险，人负责做最终判断。系统通过来源定位、摘录完整度、证据关系强度和冲突项计算评分，并在界面中解释评分依据。", body)]
story += [picture("submission/作品展示/界面截图-补证完成.png", 165*mm, 93*mm), Paragraph("图 4｜补证完成后，证据、处理轨迹与状态共同更新", small), PageBreak()]

story += [Paragraph("05｜可复现证据与体验方式", h1)]
story += [Paragraph("项目地址", h2), Paragraph("https://github.com/LucianaiB2004/proofmate", body)]
story += [Paragraph("xParse 实测文件", h2), Paragraph("输入：ProofMate-真实案例-挑战者号/03-NASA-O形环风险图表.jpg<br/>Markdown：submission-textin/evidence/workbuddy-development/xparse-output/03-NASA-O形环风险图表.md<br/>JSON：submission-textin/evidence/workbuddy-development/xparse-output/03-NASA-O形环风险图表.json<br/>输入 SHA-256：6C4CE3F20E843C33267C94F66911BF207B191136B3B5D8C668F1EC2D436718AA<br/>Markdown SHA-256：03B1EFAEBA4854075DB3EA045A4D1FA712DEE3E0CE43F6CEE45F95DC4A39F2DE<br/>JSON SHA-256：B3830E4C61FDEF6C6E8800E11E7D37CEF795A8C9FD5F212CC32B7B3673368CC6", small)]
story += [Paragraph("体验步骤", h2), Paragraph("安装依赖后运行 npm run dev，进入设置页填写自己的 TextIn App ID 与 Secret Code。返回首页上传图片或扫描 PDF，等待“TextIn xParse OCR”状态完成；在“原始材料与提取结果”中检查文字，再继续本地分析、云端复核和人工入档。密钥不会提交到仓库。", body)]
story += [Paragraph("作品边界", h2), Paragraph("ProofMate 是面向材料自检与证据整理的辅助工具，不替代学术、法律或工程领域的专业审查。模型发现必须有原文摘录和来源才能进入证据关系，最终结论由用户确认。", body)]
story += [Spacer(1, 8*mm), Paragraph("每个结论，都能找到它的证据。", quote)]

doc = SimpleDocTemplate(str(OUT), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=19*mm, title="真源 ProofMate｜TextIn xParse 实用价值赛道说明书", author="LucianaiB")
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
