# GLM-4.6V-Flash

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/rectangle-list.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 概览 </div>

GLM-4.6V-Flash 是 GLM-4.6V 的免费版本，是 GLM 系列在多模态方向上的一次重要迭代，支持开启或关闭思考模式。它将训练时上下文窗口提升到128k tokens，在 视觉理解精度上达到同参数规模 SOTA，并首次在模型架构中将 Function Call（工具调用）能力原生融入视觉模型，打通从「视觉感知」到「可执行行动（Action）」的链路，为真实业务场景中的多模态 Agent 提供统一的技术底座。

<CardGroup cols={3}>
  <Card title="输入模态" icon={<svg style={{maskImage: "url(/resource/icon/arrow-down-right.svg)", WebkitMaskImage: "url(/resource/icon/arrow-down-right.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />}>
    视频、图像、文本、文件
  </Card>

  <Card title="输出模态" icon={<svg style={{maskImage: "url(/resource/icon/arrow-down-left.svg)", WebkitMaskImage: "url(/resource/icon/arrow-down-left.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />}>
    文本
  </Card>

  <Card title="上下文窗口" icon={<svg style={{maskImage: "url(/resource/icon/arrow-down-arrow-up.svg)", WebkitMaskImage: "url(/resource/icon/arrow-down-arrow-up.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="regular">
    128K
  </Card>
</CardGroup>

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/bolt.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 能力支持 </div>

<CardGroup cols={3}>
  <Card title="深度思考" href="/cn/guide/capabilities/thinking" icon={<svg style={{maskImage: "url(/resource/icon/brain.svg)", WebkitMaskImage: "url(/resource/icon/brain.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="solid">
    支持开启或关闭思考模式，可灵活开关深层推理分析
  </Card>

  <Card title="视觉理解" icon={<svg style={{maskImage: "url(/resource/icon/eye.svg)", WebkitMaskImage: "url(/resource/icon/eye.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="regular">
    强大的视觉理解能力，支持图片，视频，文件
  </Card>

  <Card title="流式输出" href="/cn/guide/capabilities/streaming" icon={<svg style={{maskImage: "url(/resource/icon/maximize.svg)", WebkitMaskImage: "url(/resource/icon/maximize.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="regular">
    支持实时流式响应，提升用户交互体验
  </Card>

  <Card title="Function Call" href="/cn/guide/capabilities/function-calling" icon={<svg style={{maskImage: "url(/resource/icon/function.svg)", WebkitMaskImage: "url(/resource/icon/function.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="regular">
    强大的工具调用能力，支持多种外部工具集成
  </Card>

  <Card title="上下文缓存" href="/cn/guide/capabilities/cache" icon={<svg style={{maskImage: "url(/resource/icon/database.svg)", WebkitMaskImage: "url(/resource/icon/database.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} />} iconType="regular">
    智能缓存机制，优化长对话性能
  </Card>
</CardGroup>

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/stars.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 推荐场景 </div>

<Tabs>
  <Tab title="图片理解">
    **图片OCR信息提取、图片内容理解与其相关属性提取**

    | **典型场景**                                 | **功能项**                   | **能力描述**                                                                                |
    | :--------------------------------------- | :------------------------ | :-------------------------------------------------------------------------------------- |
    | 发票、证件、手写表单录入                             | **通用OCR识别**               | 支持印刷体、手写体、楷体、艺术字等                                                                       |
    | 工程造价清单、海关报关单、财务报表                        | **复杂表格解析**                | 多层表头、合并单元格、跨页表格智能识别                                                                     |
    | 手机随手拍、现场拍摄单据                             | **抗干扰识别**                 | 应对透视变形、模糊、光照不均、复杂背景、折痕、污渍等干扰场景                                                          |
    | 商品价格采集、洗衣工厂分拣、货架陈列检测                     | **商品属性识别**                | 自动识别品牌、类目、材质、颜色、款式等多维属性                                                                 |
    | 社交平台内容打标、优质内容筛选、广告素材分析                   | **图像内容分析**                | 识别图片中的场景类型、人物行为、氛围情绪、拍摄角度等高阶语义                                                          |
    | 手机屏幕质检、商品质控、工业检测                         | **瑕疵缺陷检测**                | 检测污渍、破损、变形、色差、划痕等质量问题                                                                   |
    | AIGC社区辅助用户生成相似风格图片、设计素材库的风格化标签提取、创意灵感库构建 | **图片反推提示词(Image2Prompt)** | 深度理解画面内容、风格、构图、光影，反向生成高质量的AI绘画提示词，便于复用或二次创作                                             |
    | 养殖企业、工程施工现场                              | **物体检测与计数**               | 精准识别并定位图片或视频画面中的一个或多个特定目标物体，返回每个目标的位置坐标、尺寸和类别，并支持对指定类别物体进行高精度计数，尤其适用于目标密集、遮挡、尺寸多变的复杂场景。 |
  </Tab>

  <Tab title="视频理解">
    **多模态时序融合、动态内容分析**

    | **典型场景**                       | **功能项**       | **能力描述**                                                       |
    | :----------------------------- | :------------ | :------------------------------------------------------------- |
    | 短视频平台内容分发、优质内容筛选、视频审核、广告植入检测   | **视频内容标签**    | 自动识别视频主题、风格、情绪、内容类型，支持多标签输出                                    |
    | 视频摘要生成、封面推荐、精彩集锦制作             | **关键帧提取**     | 智能识别视频中的精彩片段、转场点、关键信息帧                                         |
    | 长视频导航、精彩片段索引、会议记录、教学视频章节划分     | **事件时间轴构建**   | 自动生成视频内容的时间轴与章节划分，提取关键事件节点                                     |
    | 视频二创、剪辑辅助、广告脚本提取、影视制作参考、新人创作指导 | **智能分镜与脚本生成** | 自动将视频切分为有意义的镜头段落，识别镜头类型（特写/全景/运动镜头等），分析叙事结构，生成分镜脚本和拍摄建议        |
    | 短视频创作指导、MCN机构选题策划、平台内容运营、创作者培训 | **爆款视频热点拆解**  | 深度分析爆款视频的成功要素，拆解出"黄金3秒钩子"、"情绪起伏曲线"、"爆点时刻"等创作密码，输出可复用的创作模板内容洞察  |
    | 门店合规监控、工业生产合规性监测               | **视频巡检**      | 对实时视频流或录像文件进行 7x24 小时自动化监测，精准识别特定事件、违规行为、目标状态等，支持自定义检测规则与多场景适配 |
    | 视频搜索、内容审核、教学辅助                 | **视频问答**      | 基于视频内容进行自然语言问答，精准定位答案所在时间段                                     |
  </Tab>

  <Tab title="文档/复杂图表问答">
    **进行复杂版式理解、多格式适配、智能问答、跨页逻辑重建**

    | **典型场景**                                                   | **优势功能**    | **能力描述**                                                  |
    | :--------------------------------------------------------- | :---------- | :-------------------------------------------------------- |
    | 合同扫描件、公章盖章文件、历史档案、现场拍摄文件                                   | **抗干扰识别**   | 穿透红章、斜水印、背景噪声、褶皱污渍等干扰项，稳定识别手写体、楷体、艺术字等多种字体                |
    | -   多栏排版、页眉页脚、目录索引自动识别<br />-   复杂学术论文解析<br />-   杂志期刊内容提取 | **版式还原与重构** | 深度理解原文档排版逻辑，保留段落层级、字体样式、对齐方式等格式信息，输出结构化JSON/Markdown/HTML |
    | 长篇合同、多页报表、连续性条款解析                                          | **跨页逻辑理解**  | 自动识别跨页表格、段落续接、章节延续等跨页元素,重建完整逻辑结构                          |
    | "报表中XX项目的利润率是多少""今年营收的同比增长率是多少"                            | **文档智能问答**  | 对文档(含复杂的图表、公式数据)进行深度理解，支持自然语言提问并精准定位答案来源                  |
    | -   合同版本比对<br />-   财报年度分析<br />-   政策文件变更追踪               | **多文档关联分析** | 跨文档提取信息并进行关联比对，发现一致性、矛盾点、演变趋势                             |
  </Tab>
</Tabs>

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/gauge-high.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 使用资源 </div>

[体验中心](https://www.bigmodel.cn/trialcenter/modeltrial/visual?modelCode=glm-4.6v-flash)：快速测试模型在业务场景上的效果<br />
[接口文档](/api-reference/%E6%A8%A1%E5%9E%8B-api/%E5%AF%B9%E8%AF%9D%E8%A1%A5%E5%85%A8)：API 调用方式

**MCP 工具**：

* [万物识别 MCP](https://bigmodel.cn/marketplace/detail/052df9a6e824)：能够对图片中的地点与人物信息进行快速识别与分析。支持整图识别和对图片局部区域进行精准识别<br />
* [图像搜索 MCP](https://bigmodel.cn/marketplace/detail/d7e84d0318b0)：能够快速返回图片及网页相关信息，支持文本搜索、图片搜索、反向图片搜索及区域搜索等多种检索方式<br />
* [图像处理 MCP](https://bigmodel.cn/marketplace/detail/25a98db16370)：提供便捷、高效的图像处理（如裁剪、获取Url、画框等）能力

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/arrow-up.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 详细介绍 </div>

<Steps>
  <Step title="原生多模态工具调用" titleSize="h3">
    传统工具调用大多基于纯文本，在面对图像、视频、复杂文档等多模态内容时，需要多次中间转换，带来信息损失和工程复杂度。
    GLM-4.6V 从设计之初就围绕 「图像即参数，结果即上下文」 ，构建了原生多模态工具调用能力：

    * 输入多模态：图像、截图、文档页面等可以直接作为工具参数，无需先转为文字描述再解析，减少链路损耗。
    * 输出多模态：对于工具返回的统计图表、渲染后网页截图、检索到的商品图片等结果，模型能够再次进行视觉理解，将其纳入后续推理链路。
      模型原生支持基于视觉输入的工具调用，完整打通从感知到理解到执行的闭环。这使得 GLM-4.6V 能够应对图文混排输出、商品识别与好价推荐、以及辅助型 Agent 场景等更复杂的视觉任务。

    <Tabs>
      <Tab title="场景1：智能图文混排与内容创作">
        在内容创作与知识分发场景中，GLM-4.6V 可以从多模态输入中，自动构建高质量图文输出：无论是直接输入图文混杂的论文、研报、PPT，还是只给出一个主题，模型都能生成结构清晰、图文并茂的社交媒体内容。

        * 复杂图文理解：接收包含文本、图表、公式的文档，准确抽取结构化关键信息。
        * 多模态工具调用：在生成内容过程中，自动调用检索/搜索类工具，为每一段落寻找候选图片，或从原文中截取关键配图。
        * 图文混排输出与质量控制：对候选图片进行「视觉审核」，评估其与文字内容的相关性与质量，自动过滤无关或低质图片，输出可直接用于公众号、社交媒体或知识库的结构化图文结果。

        这一流程中，多模态理解、工具调用与质量控制均由 GLM-4.6V 模型独立在同一推理链路内完成。

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-推文-1208.m4v" controls />

        ⬆️案例1：仅输入主题，生成图文资讯

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-图文-1208.m4v" controls />

        ⬆️案例2：输入论文，生成图文并茂的科普文章
      </Tab>

      <Tab title="场景2：视觉驱动的识图购物与导购 Agent">
        在电商购物场景中，GLM-4.6V 模型可以独立完成从「看图」、「比价」、「生成导购清单」的完整链路。

        * **意图识别与任务规划：** 用户上传一张街拍图并发出「搜同款」等指令时，模型识别出购物意图，并自主规划调用 `image_search` 等相关工具。
        * **异构数据清洗与对齐：** 在京东、唯品会、拼多多等平台返回的多模态、非结构化结果基础上，模型自动完成信息清洗、字段归一化与结果对齐，过滤噪声和重复项。
        * **多模态导购结果生成：** 最终生成一张标准化 Markdown 导购表格，包含平台与店铺来源、价格、商品缩略图、匹配度与差异说明，以及可直接跳转的购买链接。

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-买同款-1208.m4v" controls />
      </Tab>

      <Tab title="场景3：前端复刻与多轮视觉交互开发">
        我们重点优化了 GLM-4.6V 在前端复刻与多轮视觉交互修改方面的能力，帮助开发者缩短「设计稿到可运行页面」的链路：

        * **像素级前端复刻：** 上传网页截图或设计稿后，模型可精准识别布局、组件与配色，生成高质量 HTML / CSS / JS 代码，实现接近像素级的页面还原。
        * **视觉交互调试：** 支持基于截图的多轮视觉交互。用户可以在生成的网页截图上圈选区域并发出自然语言指令（如「把这个按钮向左移一点，颜色改成深蓝」），模型自动定位并修正对应代码片段。

        通过 GLM Coding Plan 的视觉 MCP 协议，这一能力可以集成进现有 IDE、设计工具或内部工程平台，大幅提升前端迭代效率。

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-小红书-1208.m4v" controls />
      </Tab>

      <Tab title="场景4：长上下文的文档与视频理解">
        GLM-4.6V 将视觉编码器与语言模型的上下文对齐能力提升至128k，模型拥有了“过目不忘”的长记忆力。在实际应用中，128k上下文约等于150页的复杂文档、200页PPT或一小时视频，能够在单次推理中处理多个长文档或长视频。

        在下列案例中，用户一次输入 4 家上市公司的财报，GLM-4.6V 可以跨文档统一抽取核心指标，并理解报表与图表中的隐性信号，自动汇总成一张对比分析表，在长窗口条件下依然保持关键信息不丢失。

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-财报-1208.m4v" controls />

        上述能力同样适用于长视频内容的理解与定位：

        在长视频理解场景下，GLM-4.6V 既能对整段内容进行全局梳理，又能结合时序线索做细粒度推理，精准定位关键时间点，例如自动完成一场足球比赛的进球事件与比分时间轴总结。

        <video className="m-0 p-1" src="https://cdn.bigmodel.cn/static/4.6v/Case-球赛-1208.m4v" controls />
      </Tab>
    </Tabs>
  </Step>

  <Step title="同规模开源 SOTA" iconType="regular" stepNumber={2} titleSize="h3">
    GLM-4.6V 在 MMBench、MathVista、OCRBench 等 30+ 主流多模态评测基准 上进行了验证，较上一代模型取得显著提升。在同等参数规模下，模型在多模态交互、逻辑推理和长上下文等关键能力上取得 SOTA 表现。其中9B版本的GLM-4.6V-Flash整体表现超过Qwen3-VL-8B，106B参数12B激活的GLM-4.6V表现比肩2倍参数量的Qwen3-VL-235B。

    ![Description](https://cdn.bigmodel.cn/markdown/1765165989046glm-4.6v-1.jpeg?attname=glm-4.6v-1.jpeg)
  </Step>
</Steps>

## <div className="flex items-center"> <svg style={{maskImage: "url(/resource/icon/rectangle-code.svg)", maskRepeat: "no-repeat", maskPosition: "center center",}} className={"h-6 w-6 bg-primary dark:bg-primary-light !m-0 shrink-0"} /> 调用示例 </div>

### 基础与流式

<Tabs>
  <Tab title="cURL">
    **基础调用**

    ```bash  theme={null}
    curl -X POST \
    https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Authorization: Bearer your-api-key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "glm-4.6v-flash",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
              }
            },
            {
              "type": "text",
              "text": "Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
            }
          ]
        }
      ],
      "thinking": {
        "type": "enabled"
      }
    }'
    ```

    **流式调用**

    ```bash  theme={null}
    curl -X POST \
    https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Authorization: Bearer your-api-key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "glm-4.6v-flash",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
              }
            },
            {
              "type": "text",
              "text": "Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
            }
          ]
        }
      ],
      "thinking": {
        "type": "enabled"
      },
      "stream": true
    }'
    ```
  </Tab>

  <Tab title="Python">
    **安装 SDK**

    ```bash  theme={null}
    # 安装最新版本
    pip install zai-sdk
    # 或指定版本
    pip install zai-sdk==0.1.0
    ```

    **验证安装**

    ```python  theme={null}
    import zai
    print(zai.__version__)
    ```

    **基础调用**

    ```python  theme={null}
    from zai import ZhipuAiClient

    client = ZhipuAiClient(api_key="")  # 填写您自己的 APIKey
    response = client.chat.completions.create(
        model="glm-4.6v-flash",  # 填写需要调用的模型名称
        messages=[
            {
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
                    }
                ],
                "role": "user"
            }
        ],
        thinking={
            "type": "enabled"
        }
    )
    print(response.choices[0].message)
    ```

    **流式调用**

    ```python  theme={null}
    from zai import ZhipuAiClient

    client = ZhipuAiClient(api_key="")  # 填写您自己的APIKey
    response = client.chat.completions.create(
        model="glm-4.6v-flash",  # 填写需要调用的模型名称
        messages=[
            {
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
                    }
                ],
                "role": "user"
            }
        ],
        thinking={
            "type": "enabled"
        },
        stream=True
    )

    for chunk in response:
        if chunk.choices[0].delta.reasoning_content:
            print(chunk.choices[0].delta.reasoning_content, end='', flush=True)

        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='', flush=True)
    ```
  </Tab>

  <Tab title="Java">
    **安装 SDK**

    **Maven**

    ```xml  theme={null}
    <dependency>
        <groupId>ai.z.openapi</groupId>
        <artifactId>zai-sdk</artifactId>
        <version>0.1.3</version>
    </dependency>
    ```

    **Gradle (Groovy)**

    ```groovy  theme={null}
    implementation 'ai.z.openapi:zai-sdk:0.1.0'
    ```

    **基础调用**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import ai.z.openapi.core.Constants;
    import java.util.Arrays;

    public class GLM46VExample {
        public static void main(String[] args) {
            String apiKey = ""; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder()
                    .apiKey(apiKey)
                    .build();

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("描述下这张图片")
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("image_url")
                                                    .imageUrl(ImageUrl.builder()
                                                            .url("https://aigc-files.bigmodel.cn/api/cogview/20250723213827da171a419b9b4906_0.png")
                                                            .build())
                                                    .build()))
                                    .build()))
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                Object reply = response.getData().getChoices().get(0).getMessage();
                System.out.println(reply);
            } else {
                System.err.println("错误: " + response.getMsg());
            }
        }
    }
    ```

    **流式调用**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import ai.z.openapi.core.Constants;
    import java.util.Arrays;

    public class GLM46VStreamExample {
        public static void main(String[] args) {
            String apiKey = ""; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder()
                    .apiKey(apiKey)
                    .build();

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format")
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("image_url")
                                                    .imageUrl(ImageUrl.builder()
                                                            .url("https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG")
                                                            .build())
                                                    .build()))
                                    .build()))
                    .stream(true)
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                response.getFlowable().subscribe(
                        // Process streaming message data
                        data -> {
                            if (data.getChoices() != null && !data.getChoices().isEmpty()) {
                                Delta delta = data.getChoices().get(0).getDelta();
                                System.out.print(delta + "\n");
                            }
                        },
                        // Process streaming response error
                        error -> System.err.println("\nStream error: " + error.getMessage()),
                        // Process streaming response completion event
                        () -> System.out.println("\nStreaming response completed")
                );
            } else {
                System.err.println("Error: " + response.getMsg());
            }
        }
    }
    ```
  </Tab>

  <Tab title="Python(旧)">
    **更新 SDK 至 2.1.5.20250726**

    ```bash  theme={null}
    # 安装最新版本
    pip install zhipuai

    # 或指定版本
    pip install zhipuai==2.1.5.20250726
    ```

    **基础调用**

    ```Python  theme={null}
    from zhipuai import ZhipuAI

    client = ZhipuAI(api_key="your-api-key")  # 填写您自己的APIKey

    response = client.chat.completions.create(
        model="glm-4.6v-flash",  # 填写需要调用的模型名称
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": "请帮我解决这个题目，给出详细过程和答案"
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "传入图片的 url 地址"
                        }
                    }
                ]
            }
        ]
    )

    print(response.choices[0].message)
    ```

    **流式调用**

    ```python  theme={null}
    from zhipuai import ZhipuAI

    client = ZhipuAI(api_key="your-api-key")  # 填写您自己的APIKey

    response = client.chat.completions.create(
        model="glm-4.6v-flash",  # 填写需要调用的模型名称
        messages=[
            {
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://cloudcovert-1305175928.cos.ap-guangzhou.myqcloud.com/%E5%9B%BE%E7%89%87grounding.PNG"
                        }
                    },
                    {
                        "type": "text",
                        "text": "Where is the second bottle of beer from the right on the table?  Provide coordinates in [[xmin,ymin,xmax,ymax]] format"
                    }
                ],
                "role": "user"
            }
        ],
        thinking={
            "type": "enabled"
        },
        stream=True
    )

    for chunk in response:
        if chunk.choices[0].delta.reasoning_content:
            print(chunk.choices[0].delta.reasoning_content, end='', flush=True)

        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end='', flush=True)
    ```
  </Tab>
</Tabs>

### 多模态理解

> 不支持同时理解文件、视频和图像。

<Tabs>
  <Tab title="cURL">
    **图片理解**

    ```bash  theme={null}
    curl -X POST \
    https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Authorization: Bearer your-api-key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "glm-4.6v-flash",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "image_url",
              "image_url": {
                "url": "https://cdn.bigmodel.cn/static/logo/register.png"
              }
            },
            {
              "type": "image_url",
              "image_url": {
                "url": "https://cdn.bigmodel.cn/static/logo/api-key.png"
              }
            },
            {
              "type": "text",
              "text": "What are the pics talk about?"
            }
          ]
        }
      ],
      "thinking": {
        "type": "enabled"
      }
    }'
    ```

    **视频理解**

    ```bash  theme={null}
    curl -X POST \
    https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Authorization: Bearer your-api-key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "glm-4.6v-flash",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "video_url",
              "video_url": {
                "url": "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
              }
            },
            {
              "type": "text",
              "text": "What are the video show about?"
            }
          ]
        }
      ],
      "thinking": {
        "type": "enabled"
      }
    }'
    ```

    **文件理解**

    ```bash  theme={null}
    curl -X POST \
    https://open.bigmodel.cn/api/paas/v4/chat/completions \
    -H "Authorization: Bearer your-api-key" \
    -H "Content-Type: application/json" \
    -d '{
      "model": "glm-4.6v-flash",
      "messages": [
        {
          "role": "user",
          "content": [
            {
              "type": "file_url",
              "file_url": {
                "url": "https://cdn.bigmodel.cn/static/demo/demo2.txt"
              }
            },
            {
              "type": "file_url",
              "file_url": {
                "url": "https://cdn.bigmodel.cn/static/demo/demo1.pdf"
              }
            },
            {
              "type": "text",
              "text": "What are the files show about?"
            }
          ]
        }
      ],
      "thinking": {
        "type": "enabled"
      }
    }'
    ```
  </Tab>

  <Tab title="Python">
    **安装 SDK**

    ```bash  theme={null}
    # 安装最新版本
    pip install zai-sdk
    # 或指定版本
    pip install zai-sdk==0.1.0
    ```

    **验证安装**

    ```python  theme={null}
    import zai
    print(zai.__version__)
    ```

    **图片理解**

    ```python  theme={null}
    from zai import ZhipuAiClient

    client = ZhipuAiClient(api_key="your-api-key")  # 填写您自己的APIKey
    response = client.chat.completions.create(
        model="glm-4.6v-flash",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://cdn.bigmodel.cn/static/logo/register.png"
                        }
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": "https://cdn.bigmodel.cn/static/logo/api-key.png"
                        }
                    },
                    {
                        "type": "text",
                        "text": "What are the pics talk about?"
                    }
                ]
            }
        ],
        thinking={
            "type": "enabled"
        }
    )
    print(response.choices[0].message)
    ```

    **传入 Base64 图片**

    ```python  theme={null}
    from zai import ZhipuAiClient
    import base64

    client = ZhipuAiClient(api_key="your-api-key")  # 填写您自己的APIKey

    img_path = "your/path/xxx.png"
    with open(img_path, "rb") as img_file:
        img_base = base64.b64encode(img_file.read()).decode("utf-8")

    response = client.chat.completions.create(
        model="glm-4.6v-flash",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": img_base
                        }
                    },
                    {
                        "type": "text",
                        "text": "请描述这个图片"
                    }
                ]
            }
        ],
        thinking={
            "type": "enabled"
        }
    )
    print(response.choices[0].message)
    ```

    **视频理解**

    ```python  theme={null}
    from zai import ZhipuAiClient

    client = ZhipuAiClient(api_key="your-api-key")  # 填写您自己的APIKey
    response = client.chat.completions.create(
        model="glm-4.6v-flash",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "video_url",
                        "video_url": {
                            "url": "https://cdn.bigmodel.cn/agent-demos/lark/113123.mov"
                        }
                    },
                    {
                        "type": "text",
                        "text": "What are the video show about?"
                    }
                ]
            }
        ],
        thinking={
            "type": "enabled"
        }
    )
    print(response.choices[0].message)
    ```

    **文件理解**

    ```python  theme={null}
    from zai import ZhipuAiClient

    client = ZhipuAiClient(api_key="your-api-key")  # 填写您自己的APIKey
    response = client.chat.completions.create(
        model="glm-4.6v-flash",
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "file_url",
                        "file_url": {
                            "url": "https://cdn.bigmodel.cn/static/demo/demo2.txt"
                        }
                    },
                    {
                        "type": "file_url",
                        "file_url": {
                            "url": "https://cdn.bigmodel.cn/static/demo/demo1.pdf"
                        }
                    },
                    {
                        "type": "text",
                        "text": "What are the files show about?"
                    }
                ]
            }
        ],
        thinking={
            "type": "enabled"
        }
    )
    print(response.choices[0].message)
    ```
  </Tab>

  <Tab title="Java">
    **安装 SDK**

    **Maven**

    ```xml  theme={null}
    <dependency>
        <groupId>ai.z.openapi</groupId>
        <artifactId>zai-sdk</artifactId>
        <version>0.1.3</version>
    </dependency>
    ```

    **Gradle (Groovy)**

    ```groovy  theme={null}
    implementation 'ai.z.openapi:zai-sdk:0.1.0'
    ```

    **图片理解**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import java.util.Arrays;

    public class MultiModalImageExample {
        public static void main(String[] args) {
            String apiKey = "your-api-key"; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder()
                    .apiKey(apiKey)
                    .build();

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("image_url")
                                                    .imageUrl(ImageUrl.builder()
                                                            .url("https://cdn.bigmodel.cn/static/logo/register.png")
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("image_url")
                                                    .imageUrl(ImageUrl.builder()
                                                            .url("https://cdn.bigmodel.cn/static/logo/api-key.png")
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("What are the pics talk about?")
                                                    .build()
                                    ))
                                    .build()
                    ))
                    .thinking(ChatThinking.builder()
                            .type("enabled")
                            .build())
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                Object reply = response.getData().getChoices().get(0).getMessage();
                System.out.println(reply);
            } else {
                System.err.println("错误: " + response.getMsg());
            }
        }
    }
    ```

    **传入 Base64 图片**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import java.io.File;
    import java.io.IOException;
    import java.nio.file.Files;
    import java.util.Arrays;
    import java.util.Base64;

    public class Base64ImageExample {
        public static void main(String[] args) throws IOException {
            String apiKey = "your-api-key"; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder().apiKey(apiKey).build();

            String file = ClassLoader.getSystemResource("your/path/xxx.png").getFile();
            byte[] bytes = Files.readAllBytes(new File(file).toPath());
            Base64.Encoder encoder = Base64.getEncoder();
            String base64 = encoder.encodeToString(bytes);

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("image_url")
                                                    .imageUrl(ImageUrl.builder()
                                                            .url(base64)
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("What are the pics talk about?")
                                                    .build()))
                                    .build()))
                    .thinking(ChatThinking.builder().type("enabled").build())
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                Object reply = response.getData().getChoices().get(0).getMessage();
                System.out.println(reply);
            } else {
                System.err.println("错误: " + response.getMsg());
            }
        }
    }
    ```

    **视频理解**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import java.util.Arrays;

    public class MultiModalVideoExample {
        public static void main(String[] args) {
            String apiKey = "your-api-key"; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder()
                    .apiKey(apiKey)
                    .build();

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("video_url")
                                                    .videoUrl(VideoUrl.builder()
                                                            .url("https://cdn.bigmodel.cn/agent-demos/lark/113123.mov")
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("What are the video show about?")
                                                    .build()
                                    ))
                                    .build()
                    ))
                    .thinking(ChatThinking.builder()
                            .type("enabled")
                            .build())
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                Object reply = response.getData().getChoices().get(0).getMessage();
                System.out.println(reply);
            } else {
                System.err.println("错误: " + response.getMsg());
            }
        }
    }
    ```

    **文件理解**

    ```java  theme={null}
    import ai.z.openapi.ZhipuAiClient;
    import ai.z.openapi.service.model.*;
    import java.util.Arrays;

    public class MultiModalFileExample {
        public static void main(String[] args) {
            String apiKey = "your-api-key"; // 请填写您自己的APIKey
            ZhipuAiClient client = ZhipuAiClient.builder()
                    .apiKey(apiKey)
                    .build();

            ChatCompletionCreateParams request = ChatCompletionCreateParams.builder()
                    .model("glm-4.6v-flash")
                    .messages(Arrays.asList(
                            ChatMessage.builder()
                                    .role(ChatMessageRole.USER.value())
                                    .content(Arrays.asList(
                                            MessageContent.builder()
                                                    .type("file_url")
                                                    .fileUrl(FileUrl.builder()
                                                            .url("https://cdn.bigmodel.cn/static/demo/demo2.txt")
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("file_url")
                                                    .fileUrl(FileUrl.builder()
                                                            .url("https://cdn.bigmodel.cn/static/demo/demo1.pdf")
                                                            .build())
                                                    .build(),
                                            MessageContent.builder()
                                                    .type("text")
                                                    .text("What are the files show about?")
                                                    .build()
                                    ))
                                    .build()
                    ))
                    .thinking(ChatThinking.builder()
                            .type("enabled")
                            .build())
                    .build();

            ChatCompletionResponse response = client.chat().createChatCompletion(request);

            if (response.isSuccess()) {
                Object reply = response.getData().getChoices().get(0).getMessage();
                System.out.println(reply);
            } else {
                System.err.println("错误: " + response.getMsg());
            }
        }
    }
    ```
  </Tab>
</Tabs>


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.bigmodel.cn/llms.txt


# 对话补全

> 和 [指定模型](/cn/guide/start/model-overview) 对话，模型根据请求给出响应。支持多种模型，支持多模态（文本、图片、音频、视频、文件），流式和非流式输出，可配置采样，温度，最大令牌数，工具调用等。

## OpenAPI

````yaml openapi/openapi.json post /paas/v4/chat/completions
paths:
  path: /paas/v4/chat/completions
  method: post
  servers:
    - url: https://open.bigmodel.cn/api/
      description: 开放平台服务
  request:
    security:
      - title: bearerAuth
        parameters:
          query: {}
          header:
            Authorization:
              type: http
              scheme: bearer
              description: >-
                使用以下格式进行身份验证：Bearer [<your api
                key>](https://bigmodel.cn/usercenter/proj-mgmt/apikeys)
          cookie: {}
    parameters:
      path: {}
      query: {}
      header: {}
      cookie: {}
    body:
      application/json:
        schemaArray:
          - type: object
            properties:
              model:
                allOf:
                  - type: string
                    description: >-
                      调用的普通对话模型代码。`GLM-4.6` 是最新的旗舰模型系列，专为智能体应用打造的基础模型。`GLM-4.6`
                      `GLM-4.5` 系列提供了复杂推理、超长上下文、极快推理速度等多款模型。
                    example: glm-4.6
                    default: glm-4.6
                    enum:
                      - glm-4.6
                      - glm-4.5
                      - glm-4.5-air
                      - glm-4.5-x
                      - glm-4.5-airx
                      - glm-4.5-flash
                      - glm-4-plus
                      - glm-4-air-250414
                      - glm-4-airx
                      - glm-4-flashx
                      - glm-4-flashx-250414
              messages:
                allOf:
                  - type: array
                    description: >-
                      对话消息列表，包含当前对话的完整上下文信息。每条消息都有特定的角色和内容，模型会根据这些消息生成回复。消息按时间顺序排列，支持四种角色：`system`（系统消息，用于设定`AI`的行为和角色）、`user`（用户消息，来自用户的输入）、`assistant`（助手消息，来自`AI`的回复）、`tool`（工具消息，工具调用的结果）。普通对话模型主要支持纯文本内容。注意不能只包含系统消息或助手消息。
                    items:
                      oneOf:
                        - title: 用户消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - user
                              description: 消息作者的角色
                              default: user
                            content:
                              type: string
                              description: 文本消息内容
                              example: >-
                                What opportunities and challenges will the
                                Chinese large model industry face in 2025?
                          required:
                            - role
                            - content
                        - title: 系统消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - system
                              description: 消息作者的角色
                              default: system
                            content:
                              type: string
                              description: 消息文本内容
                              example: You are a helpful assistant.
                          required:
                            - role
                            - content
                        - title: 助手消息
                          type: object
                          description: 可包含工具调用
                          properties:
                            role:
                              type: string
                              enum:
                                - assistant
                              description: 消息作者的角色
                              default: assistant
                            content:
                              type: string
                              description: 文本消息内容
                              example: I'll help you with that analysis.
                            tool_calls:
                              type: array
                              description: 模型生成的工具调用消息。当提供此字段时，`content`通常为空。
                              items:
                                type: object
                                properties:
                                  id:
                                    type: string
                                    description: 工具调用ID
                                  type:
                                    type: string
                                    description: 工具类型，支持 `web_search、retrieval、function`
                                    enum:
                                      - function
                                      - web_search
                                      - retrieval
                                  function:
                                    type: object
                                    description: 函数调用信息，当`type`为`function`时不为空
                                    properties:
                                      name:
                                        type: string
                                        description: 函数名称
                                      arguments:
                                        type: string
                                        description: 函数参数，`JSON`格式字符串
                                    required:
                                      - name
                                      - arguments
                                required:
                                  - id
                                  - type
                          required:
                            - role
                        - title: 工具消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - tool
                              description: 消息作者的角色
                              default: tool
                            content:
                              type: string
                              description: 消息文本内容
                              example: 'Function executed successfully with result: ...'
                            tool_call_id:
                              type: string
                              description: 指示此消息对应的工具调用 `ID`
                          required:
                            - role
                            - content
                    minItems: 1
              stream:
                allOf:
                  - type: boolean
                    example: false
                    default: false
                    description: >-
                      是否启用流式输出模式。默认值为 `false`。当设置为 `false`
                      时，模型会在生成完整响应后一次性返回所有内容，适合短文本生成和批处理场景。当设置为 `true`
                      时，模型会通过`Server-Sent Events
                      (SSE)`流式返回生成的内容，用户可以实时看到文本生成过程，适合聊天对话和长文本生成场景，能提供更好的用户体验。流式输出结束时会返回
                      `data: [DONE]` 消息。
              thinking:
                allOf:
                  - $ref: '#/components/schemas/ChatThinking'
              do_sample:
                allOf:
                  - type: boolean
                    example: true
                    default: true
                    description: >-
                      是否启用采样策略来生成文本。默认值为 `true`。当设置为 `true` 时，模型会使用
                      `temperature、top_p` 等参数进行随机采样，生成更多样化的输出；当设置为 `false`
                      时，模型总是选择概率最高的词汇，生成更确定性的输出，此时 `temperature` 和 `top_p`
                      参数将被忽略。对于需要一致性和可重复性的任务（如代码生成、翻译），建议设置为 `false`。
              temperature:
                allOf:
                  - type: number
                    description: >-
                      采样温度，控制输出的随机性和创造性，取值范围为 `[0.0,
                      1.0]`，限两位小数。对于`GLM-4.6`系列默认值为 `1.0`，`GLM-4.5`系列默认值为
                      `0.6`，`GLM-4`系列默认值为
                      `0.75`。较高的值（如`0.8`）会使输出更随机、更具创造性，适合创意写作和头脑风暴；较低的值（如`0.2`）会使输出更稳定、更确定，适合事实性问答和代码生成。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 1
                    default: 1
                    minimum: 0
                    maximum: 1
              top_p:
                allOf:
                  - type: number
                    description: >-
                      核采样（`nucleus sampling`）参数，是`temperature`采样的替代方法，取值范围为
                      `[0.01, 1.0]`，限两位小数。对于`GLM-4.6` `GLM-4.5`系列默认值为
                      `0.95`，`GLM-4`系列默认值为
                      `0.9`。模型只考虑累积概率达到`top_p`的候选词汇。例如：`0.1`表示只考虑前`10%`概率的词汇，`0.9`表示考虑前`90%`概率的词汇。较小的值会产生更集中、更一致的输出；较大的值会增加输出的多样性。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不建议同时调整两个参数。
                    format: float
                    example: 0.95
                    default: 0.95
                    minimum: 0.01
                    maximum: 1
              max_tokens:
                allOf:
                  - type: integer
                    description: >-
                      模型输出的最大令牌`token`数量限制。`GLM-4.6`最大支持`128K`输出长度，`GLM-4.5`最大支持`96K`输出长度，建议设置不小于`1024`。令牌是文本的基本单位，通常`1`个令牌约等于`0.75`个英文单词或`1.5`个中文字符。设置合适的`max_tokens`可以控制响应长度和成本，避免过长的输出。如果模型在达到`max_tokens`限制前完成回答，会自然结束；如果达到限制，输出可能被截断。

                      默认值和最大值等更多详见 [max_tokens
                      文档](/cn/guide/start/concept-param#max_tokens)
                    example: 1024
                    minimum: 1
                    maximum: 131072
              tool_stream:
                allOf:
                  - type: boolean
                    example: false
                    default: false
                    description: >-
                      是否开启流式响应`Function Calls`，仅限`GLM-4.6`支持此参数，默认值`false`。参考
                      [工具流式输出](/cn/guide/capabilities/stream-tool)
              tools:
                allOf:
                  - type: array
                    description: >-
                      模型可以调用的工具列表。支持函数调用、知识库检索和网络搜索。使用此参数提供模型可以生成 `JSON`
                      输入的函数列表或配置其他工具。最多支持 `128` 个函数。目前 `GLM-4` 系列已支持所有
                      `tools`，`GLM-4.5` 已支持 `web search` 和 `retrieval`。
                    anyOf:
                      - items:
                          $ref: '#/components/schemas/FunctionToolSchema'
                      - items:
                          $ref: '#/components/schemas/RetrievalToolSchema'
                      - items:
                          $ref: '#/components/schemas/WebSearchToolSchema'
                      - items:
                          $ref: '#/components/schemas/MCPToolSchema'
              tool_choice:
                allOf:
                  - oneOf:
                      - type: string
                        enum:
                          - auto
                        description: >-
                          用于控制模型选择调用哪个函数的方式，仅在工具类型为`function`时补充。默认`auto`且仅支持`auto`。
                    description: 控制模型如何选择工具。
              stop:
                allOf:
                  - type: array
                    description: >-
                      停止词列表，当模型生成的文本中遇到这些指定的字符串时会立即停止生成。目前仅支持单个停止词，格式为["stop_word1"]。停止词不会包含在返回的文本中。这对于控制输出格式、防止模型生成不需要的内容非常有用，例如在对话场景中可以设置["Human:"]来防止模型模拟用户发言。
                    items:
                      type: string
                    maxItems: 1
              response_format:
                allOf:
                  - type: object
                    description: >-
                      指定模型的响应输出格式，默认为`text`，仅文本模型支持此字段。支持两种格式：{ "type": "text" }
                      表示普通文本输出模式，模型返回自然语言文本；{ "type": "json_object" }
                      表示`JSON`输出模式，模型会返回有效的`JSON`格式数据，适用于结构化数据提取、`API`响应生成等场景。使用`JSON`模式时，建议在提示词中明确说明需要`JSON`格式输出。
                    properties:
                      type:
                        type: string
                        enum:
                          - text
                          - json_object
                        default: text
                        description: 输出格式类型：`text`表示普通文本输出，`json_object`表示`JSON`格式输出
                    required:
                      - type
              request_id:
                allOf:
                  - type: string
                    description: 请求唯一标识符。由用户端传递，建议使用`UUID`格式确保唯一性，若未提供平台将自动生成。
              user_id:
                allOf:
                  - type: string
                    description: 终端用户的唯一标识符。`ID`长度要求：最少`6`个字符，最多`128`个字符，建议使用不包含敏感信息的唯一标识。
                    minLength: 6
                    maxLength: 128
            required: true
            title: 文本模型
            description: 普通对话模型请求，支持纯文本对话和工具调用
            refIdentifier: '#/components/schemas/ChatCompletionTextRequest'
            requiredProperties:
              - model
              - messages
          - type: object
            properties:
              model:
                allOf:
                  - type: string
                    description: >-
                      调用的视觉模型代码。`GLM-4.5V`
                      系列支持视觉理解，具备卓越的多模态理解能力。`GLM-4.1v-thinking` 系列支持视觉推理思考。
                    example: glm-4.5v
                    default: glm-4.5v
                    enum:
                      - glm-4.5v
                      - glm-4v-plus-0111
                      - glm-4v-flash
                      - glm-4.1v-thinking-flashx
                      - glm-4.1v-thinking-flash
              messages:
                allOf:
                  - type: array
                    description: >-
                      对话消息列表，包含当前对话的完整上下文信息。每条消息都有特定的角色和内容，模型会根据这些消息生成回复。消息按时间顺序排列，支持角色：`system`（系统消息，用于设定`AI`的行为和角色）、`user`（用户消息，来自用户的输入）、`assistant`（助手消息，来自`AI`的回复）。视觉模型支持纯文本和多模态内容（文本、图片、视频、文件）。注意不能只包含系统或助手消息。
                    items:
                      oneOf:
                        - title: 用户消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - user
                              description: 消息作者的角色
                              default: user
                            content:
                              oneOf:
                                - type: array
                                  description: 多模态消息内容，支持文本、图片、文件、视频（可从上方切换至文本消息）
                                  items:
                                    $ref: >-
                                      #/components/schemas/VisionMultimodalContentItem
                                - type: string
                                  description: 文本消息内容（可从上方切换至多模态消息）
                                  example: >-
                                    What opportunities and challenges will the
                                    Chinese large model industry face in 2025?
                          required:
                            - role
                            - content
                        - title: 系统消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - system
                              description: 消息作者的角色
                              default: system
                            content:
                              oneOf:
                                - type: string
                                  description: 消息文本内容
                                  example: You are a helpful assistant.
                          required:
                            - role
                            - content
                        - title: 助手消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - assistant
                              description: 消息作者的角色
                              default: assistant
                            content:
                              oneOf:
                                - type: string
                                  description: 文本消息内容
                                  example: I'll help you with that analysis.
                          required:
                            - role
                    minItems: 1
              stream:
                allOf:
                  - type: boolean
                    example: false
                    default: false
                    description: >-
                      是否启用流式输出模式。默认值为 `false`。当设置为 `false`
                      时，模型会在生成完整响应后一次性返回所有内容，适合短文本生成和批处理场景。当设置为 `true`
                      时，模型会通过`Server-Sent Events
                      (SSE)`流式返回生成的内容，用户可以实时看到文本生成过程，适合聊天对话和长文本生成场景，能提供更好的用户体验。流式输出结束时会返回
                      `data: [DONE]` 消息。
              thinking:
                allOf:
                  - $ref: '#/components/schemas/ChatThinking'
              do_sample:
                allOf:
                  - type: boolean
                    example: true
                    default: true
                    description: >-
                      是否启用采样策略来生成文本。默认值为 `true`。当设置为 `true` 时，模型会使用
                      `temperature、top_p` 等参数进行随机采样，生成更多样化的输出；当设置为 `false`
                      时，模型总是选择概率最高的词汇，生成更确定性的输出，此时 `temperature` 和 `top_p`
                      参数将被忽略。对于需要一致性和可重复性的任务（如代码生成、翻译），建议设置为 `false`。
              temperature:
                allOf:
                  - type: number
                    description: >-
                      采样温度，控制输出的随机性和创造性，取值范围为 `[0.0,
                      1.0]`，限两位小数。对于`GLM-4.5V`系列默认值为 `0.8`，`GLM-4.1v`系列默认值为
                      `0.8`。较高的值（如`0.8`）会使输出更随机、更具创造性，适合创意写作和头脑风暴；较低的值（如`0.2`）会使输出更稳定、更确定，适合事实性问答和代码生成。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 0.8
                    default: 0.8
                    minimum: 0
                    maximum: 1
              top_p:
                allOf:
                  - type: number
                    description: >-
                      核采样（`nucleus sampling`）参数，是`temperature`采样的替代方法，取值范围为
                      `[0.01, 1.0]`，限两位小数。对于`GLM-4.5V`系列默认值为
                      `0.6`，`GLM-4.1v`系列默认值为
                      `0.6`。模型只考虑累积概率达到`top_p`的候选词汇。例如：`0.1`表示只考虑前`10%`概率的词汇，`0.9`表示考虑前`90%`概率的词汇。较小的值会产生更集中、更一致的输出；较大的值会增加输出的多样性。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 0.6
                    default: 0.6
                    minimum: 0.01
                    maximum: 1
              max_tokens:
                allOf:
                  - type: integer
                    description: >-
                      模型输出的最大令牌`token`数量限制。`GLM-4.5V`最大支持`16K`输出长度，`GLM-4.1v`系列最大支持`16K`输出长度，建议设置不小于`1024`。令牌是文本的基本单位，通常`1`个令牌约等于`0.75`个英文单词或`1.5`个中文字符。设置合适的`max_tokens`可以控制响应长度和成本，避免过长的输出。如果模型在达到`max_tokens`限制前完成回答，会自然结束；如果达到限制，输出可能被截断。

                      默认值和最大值等更多详见 [max_tokens
                      文档](/cn/guide/start/concept-param#max_tokens)
                    example: 1024
                    minimum: 1
                    maximum: 16384
              stop:
                allOf:
                  - type: array
                    description: >-
                      停止词列表，当模型生成的文本中遇到这些指定的字符串时会立即停止生成。目前仅支持单个停止词，格式为["stop_word1"]。停止词不会包含在返回的文本中。这对于控制输出格式、防止模型生成不需要的内容非常有用，例如在对话场景中可以设置["Human:"]来防止模型模拟用户发言。
                    items:
                      type: string
                    maxItems: 1
              request_id:
                allOf:
                  - type: string
                    description: 请求唯一标识符。由用户端传递，建议使用`UUID`格式确保唯一性，若未提供平台将自动生成。
              user_id:
                allOf:
                  - type: string
                    description: 终端用户的唯一标识符。`ID`长度要求：最少`6`个字符，最多`128`个字符，建议使用不包含敏感信息的唯一标识。
                    minLength: 6
                    maxLength: 128
            required: true
            title: 视觉模型
            description: 视觉模型请求，支持多模态内容（文本、图片、视频、文件）
            refIdentifier: '#/components/schemas/ChatCompletionVisionRequest'
            requiredProperties:
              - model
              - messages
          - type: object
            properties:
              model:
                allOf:
                  - type: string
                    description: 调用的音频模型代码。`GLM-4-Voice` 支持语音理解和生成。
                    example: glm-4-voice
                    default: glm-4-voice
                    enum:
                      - glm-4-voice
                      - 禁用仅占位
              messages:
                allOf:
                  - type: array
                    description: >-
                      对话消息列表，包含当前对话的完整上下文信息。每条消息都有特定的角色和内容，模型会根据这些消息生成回复。消息按时间顺序排列，支持角色：`system`（系统消息，用于设定`AI`的行为和角色）、`user`（用户消息，来自用户的输入）、`assistant`（助手消息，来自`AI`的回复）。音频模型支持文本和音频内容。注意不能只包含系统或助手消息。
                    items:
                      oneOf:
                        - title: 用户消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - user
                              description: 消息作者的角色
                              default: user
                            content:
                              oneOf:
                                - type: array
                                  description: 多模态消息内容，支持文本、音频
                                  items:
                                    $ref: >-
                                      #/components/schemas/AudioMultimodalContentItem
                                - type: string
                                  description: 消息文本内容
                                  example: You are a helpful assistant.
                          required:
                            - role
                            - content
                        - title: 系统消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - system
                              description: 消息作者的角色
                              default: system
                            content:
                              type: string
                              description: 消息文本内容
                              example: 你是一个专业的语音助手，能够理解和生成自然语音。
                          required:
                            - role
                            - content
                        - title: 助手消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - assistant
                              description: 消息作者的角色
                              default: assistant
                            content:
                              oneOf:
                                - type: string
                                  description: 文本消息内容
                                  example: I'll help you with that analysis.
                            audio:
                              type: object
                              description: 语音消息
                              properties:
                                id:
                                  type: string
                                  description: 语音消息`id`，用于多轮对话
                          required:
                            - role
                    minItems: 1
              stream:
                allOf:
                  - type: boolean
                    example: false
                    default: false
                    description: >-
                      是否启用流式输出模式。默认值为 `false`。当设置为 `false`
                      时，模型会在生成完整响应后一次性返回所有内容，适合语音识别和批处理场景。当设置为 `true`
                      时，模型会通过`Server-Sent Events
                      (SSE)`流式返回生成的内容，用户可以实时看到文本生成过程，适合实时语音对话场景，能提供更好的用户体验。流式输出结束时会返回
                      `data: [DONE]` 消息。
              do_sample:
                allOf:
                  - type: boolean
                    example: true
                    default: true
                    description: >-
                      是否启用采样策略来生成文本。默认值为 `true`。当设置为 `true` 时，模型会使用
                      `temperature、top_p` 等参数进行随机采样，生成更多样化的输出；当设置为 `false`
                      时，模型总是选择概率最高的词汇，生成更确定性的输出，此时 `temperature` 和 `top_p`
                      参数将被忽略。对于需要一致性和可重复性的任务（如语音识别、转录），建议设置为 `false`。
              temperature:
                allOf:
                  - type: number
                    description: >-
                      采样温度，控制输出的随机性和创造性，取值范围为 `[0.0,
                      1.0]`，限两位小数。对于`GLM-4-Voice`默认值为
                      `0.8`。较高的值（如`0.8`）会使输出更随机、更具创造性，适合语音生成和对话；较低的值（如`0.1`）会使输出更稳定、更确定，适合语音识别和转录。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 0.8
                    default: 0.8
                    minimum: 0
                    maximum: 1
              top_p:
                allOf:
                  - type: number
                    description: >-
                      核采样（`nucleus sampling`）参数，是`temperature`采样的替代方法，取值范围为
                      `[0.01, 1.0]`，限两位小数。对于`GLM-4-Voice`默认值为
                      `0.6`。模型只考虑累积概率达到`top_p`的候选词汇。例如：`0.1`表示只考虑前`10%`概率的词汇，`0.9`表示考虑前`90%`概率的词汇。较小的值会产生更集中、更一致的输出；较大的值会增加输出的多样性。建议根据应用场景调整
                      `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 0.6
                    default: 0.6
                    minimum: 0.01
                    maximum: 1
              max_tokens:
                allOf:
                  - type: integer
                    description: >-
                      模型输出的最大令牌`token`数量限制。`GLM-4-Voice`最大支持`4K`输出长度，默认`1024`。令牌是文本的基本单位。
                    example: 1024
                    minimum: 1
                    maximum: 4096
              watermark_enabled:
                allOf:
                  - type: boolean
                    description: |-
                      控制`AI`生成图片时是否添加水印。
                       - `true`: 默认启用`AI`生成的显式水印及隐式数字水印，符合政策要求。
                       - `false`: 关闭所有水印，仅允许已签署免责声明的客户使用，签署路径：个人中心-安全管理-去水印管理
                    example: true
              stop:
                allOf:
                  - type: array
                    description: >-
                      停止词列表，当模型生成的文本中遇到这些指定的字符串时会立即停止生成。目前仅支持单个停止词，格式为["stop_word1"]。停止词不会包含在返回的文本中。这对于控制输出格式、防止模型生成不需要的内容非常有用。
                    items:
                      type: string
                    maxItems: 1
              request_id:
                allOf:
                  - type: string
                    description: 请求唯一标识符。由用户端传递，建议使用`UUID`格式确保唯一性，若未提供平台将自动生成。
              user_id:
                allOf:
                  - type: string
                    description: 终端用户的唯一标识符。`ID`长度要求：最少`6`个字符，最多`128`个字符，建议使用不包含敏感信息的唯一标识。
                    minLength: 6
                    maxLength: 128
            required: true
            title: 音频模型
            description: 音频模型请求，支持语音理解、生成和识别功能
            refIdentifier: '#/components/schemas/ChatCompletionAudioRequest'
            requiredProperties:
              - model
              - messages
          - type: object
            properties:
              model:
                allOf:
                  - type: string
                    description: 调用的专用模型代码。`CharGLM-4` 是角色扮演专用模型，`Emohaa` 是专业心理咨询模型。
                    example: charglm-4
                    default: charglm-4
                    enum:
                      - charglm-4
                      - emohaa
              meta:
                allOf:
                  - type: object
                    description: 角色及用户信息数据(仅限 `Emohaa` 支持此参数)
                    required:
                      - user_info
                      - bot_info
                      - bot_name
                      - user_name
                    properties:
                      user_info:
                        type: string
                        description: 用户信息描述
                      bot_info:
                        type: string
                        description: 角色信息描述
                      bot_name:
                        type: string
                        description: 角色名称
                      user_name:
                        type: string
                        description: 用户名称
              messages:
                allOf:
                  - type: array
                    description: >-
                      对话消息列表，包含当前对话的完整上下文信息。每条消息都有特定的角色和内容，模型会根据这些消息生成回复。消息按时间顺序排列，支持角色：`system`（系统消息，用于设定`AI`的行为和角色）、`user`（用户消息，来自用户的输入）、`assistant`（助手消息，来自`AI`的回复）。注意不能只包含系统消息或助手消息。
                    items:
                      oneOf:
                        - title: 用户消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - user
                              description: 消息作者的角色
                              default: user
                            content:
                              type: string
                              description: 文本消息内容
                              example: 我最近工作压力很大，经常感到焦虑，不知道该怎么办
                          required:
                            - role
                            - content
                        - title: 系统消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - system
                              description: 消息作者的角色
                              default: system
                            content:
                              type: string
                              description: 消息文本内容
                              example: >-
                                你乃苏东坡。人生如梦，何不活得潇洒一些？在这忙碌纷繁的现代生活中，帮助大家找到那份属于自己的自在与豁达，共赏人生之美好
                          required:
                            - role
                            - content
                        - title: 助手消息
                          type: object
                          properties:
                            role:
                              type: string
                              enum:
                                - assistant
                              description: 消息作者的角色
                              default: assistant
                            content:
                              type: string
                              description: 文本消息内容
                              example: I'll help you with that analysis.
                          required:
                            - role
                            - content
                    minItems: 1
              stream:
                allOf:
                  - type: boolean
                    example: false
                    default: false
                    description: >-
                      是否启用流式输出模式。默认值为 `false`。当设置为 `fals`e
                      时，模型会在生成完整响应后一次性返回所有内容，适合语音识别和批处理场景。当设置为 `true`
                      时，模型会通过`Server-Sent Events
                      (SSE)`流式返回生成的内容，用户可以实时看到文本生成过程，适合实时语音对话场景，能提供更好的用户体验。流式输出结束时会返回
                      `data: [DONE]` 消息。
              do_sample:
                allOf:
                  - type: boolean
                    example: true
                    default: true
                    description: >-
                      是否启用采样策略来生成文本。默认值为 `true`。当设置为 `true` 时，模型会使用
                      `temperature、top_p` 等参数进行随机采样，生成更多样化的输出；当设置为 `false`
                      时，模型总是选择概率最高的词汇，生成更确定性的输出，此时 `temperatur`e 和 `top_p`
                      参数将被忽略。对于需要一致性和可重复性的任务（如语音识别、转录），建议设置为 `false`。
              temperature:
                allOf:
                  - type: number
                    description: >-
                      采样温度，控制输出的随机性和创造性，取值范围为 `[0.0, 1.0]`，限两位小数。`Charglm-4` 和
                      `Emohaa` 默认值为 `0.95`。建议根据应用场景调整 `top_p` 或 `temperature`
                      参数，但不要同时调整两个参数。
                    format: float
                    example: 0.8
                    default: 0.8
                    minimum: 0
                    maximum: 1
              top_p:
                allOf:
                  - type: number
                    description: >-
                      核采样（`nucleus sampling`）参数，是`temperature`采样的替代方法，取值范围为
                      `[0.01, 1.0]`，限两位小数。`Charglm-4` 和 `Emohaa` 默认值为
                      `0.7`。建议根据应用场景调整 `top_p` 或 `temperature` 参数，但不要同时调整两个参数。
                    format: float
                    example: 0.6
                    default: 0.6
                    minimum: 0.01
                    maximum: 1
              max_tokens:
                allOf:
                  - type: integer
                    description: >-
                      模型输出的最大令牌`token`数量限制。`Charglm-4` 和 `Emohaa`
                      最大支持`4K`输出长度，默认`1024`。令牌是文本的基本单位。
                    example: 1024
                    minimum: 1
                    maximum: 4096
              stop:
                allOf:
                  - type: array
                    description: >-
                      停止词列表，当模型生成的文本中遇到这些指定的字符串时会立即停止生成。目前仅支持单个停止词，格式为["stop_word1"]。停止词不会包含在返回的文本中。这对于控制输出格式、防止模型生成不需要的内容非常有用。
                    items:
                      type: string
                    maxItems: 1
              request_id:
                allOf:
                  - type: string
                    description: 请求唯一标识符。由用户端传递，建议使用`UUID`格式确保唯一性，若未提供平台将自动生成。
              user_id:
                allOf:
                  - type: string
                    description: 终端用户的唯一标识符。`ID`长度要求：最少`6`个字符，最多`128`个字符，建议使用不包含敏感信息的唯一标识。
                    minLength: 6
                    maxLength: 128
            required: true
            title: 角色模型
            description: 角色扮演，专业心理咨询专用模型
            refIdentifier: '#/components/schemas/ChatCompletionHumanOidRequest'
            requiredProperties:
              - model
              - messages
        examples:
          基础调用示例:
            value:
              model: glm-4.6
              messages:
                - role: system
                  content: 你是一个有用的AI助手。
                - role: user
                  content: 请介绍一下人工智能的发展历程。
              temperature: 1
              max_tokens: 65536
              stream: false
          流式调用示例:
            value:
              model: glm-4.6
              messages:
                - role: user
                  content: 写一首关于春天的诗。
              temperature: 1
              max_tokens: 65536
              stream: true
          深度思考示例:
            value:
              model: glm-4.6
              messages:
                - role: user
                  content: 写一首关于春天的诗。
              thinking:
                type: enabled
              stream: true
          多轮对话示例:
            value:
              model: glm-4.6
              messages:
                - role: system
                  content: 你是一个专业的编程助手
                - role: user
                  content: 什么是递归？
                - role: assistant
                  content: 递归是一种编程技术，函数调用自身来解决问题...
                - role: user
                  content: 能给我一个 Python 递归的例子吗？
              stream: true
          图片理解示例:
            value:
              model: glm-4.5v
              messages:
                - role: user
                  content:
                    - type: image_url
                      image_url:
                        url: https://cdn.bigmodel.cn/static/logo/register.png
                    - type: image_url
                      image_url:
                        url: https://cdn.bigmodel.cn/static/logo/api-key.png
                    - type: text
                      text: What are the pics talk about?
          视频理解示例:
            value:
              model: glm-4.5v
              messages:
                - role: user
                  content:
                    - type: video_url
                      video_url:
                        url: https://cdn.bigmodel.cn/agent-demos/lark/113123.mov
                    - type: text
                      text: What are the video show about?
          文件理解示例:
            value:
              model: glm-4.5v
              messages:
                - role: user
                  content:
                    - type: file_url
                      file_url:
                        url: https://cdn.bigmodel.cn/static/demo/demo2.txt
                    - type: file_url
                      file_url:
                        url: https://cdn.bigmodel.cn/static/demo/demo1.pdf
                    - type: text
                      text: What are the files show about?
          音频对话示例:
            value:
              model: glm-4-voice
              messages:
                - role: user
                  content:
                    - type: text
                      text: 你好，这是我的语音输入测试，请慢速复述一遍
                    - type: input_audio
                      input_audio:
                        data: base64_voice_xxx
                        format: wav
          Function Call 示例:
            value:
              model: glm-4.6
              messages:
                - role: user
                  content: 今天北京的天气怎么样？
              tools:
                - type: function
                  function:
                    name: get_weather
                    description: 获取指定城市的天气信息
                    parameters:
                      type: object
                      properties:
                        city:
                          type: string
                          description: 城市名称
                      required:
                        - city
              tool_choice: auto
              temperature: 0.3
  response:
    '200':
      application/json:
        schemaArray:
          - type: object
            properties:
              id:
                allOf:
                  - description: 任务 `ID`
                    type: string
              request_id:
                allOf:
                  - description: 请求 `ID`
                    type: string
              created:
                allOf:
                  - description: 请求创建时间，`Unix` 时间戳（秒）
                    type: integer
              model:
                allOf:
                  - description: 模型名称
                    type: string
              choices:
                allOf:
                  - type: array
                    description: 模型响应列表
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                          description: 结果索引
                        message:
                          $ref: '#/components/schemas/ChatCompletionResponseMessage'
                        finish_reason:
                          type: string
                          description: >-
                            推理终止原因。'stop’表示自然结束或触发stop词，'tool_calls’表示模型命中函数，'length’表示达到token长度限制，'sensitive’表示内容被安全审核接口拦截（用户应判断并决定是否撤回公开内容），'network_error’表示模型推理异常。
              usage:
                allOf:
                  - type: object
                    description: 调用结束时返回的 `Token` 使用统计。
                    properties:
                      prompt_tokens:
                        type: number
                        description: 用户输入的 `Token` 数量。
                      completion_tokens:
                        type: number
                        description: 输出的 `Token` 数量
                      prompt_tokens_details:
                        type: object
                        properties:
                          cached_tokens:
                            type: number
                            description: 命中的缓存 `Token` 数量
                      total_tokens:
                        type: integer
                        description: >-
                          `Token` 总数，对于 `glm-4-voice` 模型，`1`秒音频=`12.5
                          Tokens`，向上取整
              video_result:
                allOf:
                  - type: array
                    description: 视频生成结果。
                    items:
                      type: object
                      properties:
                        url:
                          type: string
                          description: 视频链接。
                        cover_image_url:
                          type: string
                          description: 视频封面链接。
              web_search:
                allOf:
                  - type: array
                    description: 返回与网页搜索相关的信息，使用`WebSearchToolSchema`时返回
                    items:
                      type: object
                      properties:
                        icon:
                          type: string
                          description: 来源网站的图标
                        title:
                          type: string
                          description: 搜索结果的标题
                        link:
                          type: string
                          description: 搜索结果的网页链接
                        media:
                          type: string
                          description: 搜索结果网页的媒体来源名称
                        publish_date:
                          type: string
                          description: 网站发布时间
                        content:
                          type: string
                          description: 搜索结果网页引用的文本内容
                        refer:
                          type: string
                          description: 角标序号
              content_filter:
                allOf:
                  - type: array
                    description: 返回内容安全的相关信息
                    items:
                      type: object
                      properties:
                        role:
                          type: string
                          description: >-
                            安全生效环节，包括 `role = assistant` 模型推理，`role = user`
                            用户输入，`role = history` 历史上下文
                        level:
                          type: integer
                          description: 严重程度 `level 0-3`，`level 0`表示最严重，`3`表示轻微
            refIdentifier: '#/components/schemas/ChatCompletionResponse'
        examples:
          example:
            value:
              id: <string>
              request_id: <string>
              created: 123
              model: <string>
              choices:
                - index: 123
                  message:
                    role: assistant
                    content: <string>
                    reasoning_content: <string>
                    audio:
                      id: <string>
                      data: <string>
                      expires_at: <string>
                    tool_calls:
                      - function:
                          name: <string>
                          arguments: {}
                        mcp:
                          id: <string>
                          type: mcp_list_tools
                          server_label: <string>
                          error: <string>
                          tools:
                            - name: <string>
                              description: <string>
                              annotations: {}
                              input_schema:
                                type: object
                                properties: {}
                                required:
                                  - <any>
                                additionalProperties: true
                          arguments: <string>
                          name: <string>
                          output: {}
                        id: <string>
                        type: <string>
                  finish_reason: <string>
              usage:
                prompt_tokens: 123
                completion_tokens: 123
                prompt_tokens_details:
                  cached_tokens: 123
                total_tokens: 123
              video_result:
                - url: <string>
                  cover_image_url: <string>
              web_search:
                - icon: <string>
                  title: <string>
                  link: <string>
                  media: <string>
                  publish_date: <string>
                  content: <string>
                  refer: <string>
              content_filter:
                - role: <string>
                  level: 123
        description: 业务处理成功
      text/event-stream:
        schemaArray:
          - type: object
            properties:
              id:
                allOf:
                  - type: string
                    description: 任务 ID
              created:
                allOf:
                  - type: integer
                    description: 请求创建时间，`Unix` 时间戳（秒）
              model:
                allOf:
                  - type: string
                    description: 模型名称
              choices:
                allOf:
                  - type: array
                    description: 模型响应列表
                    items:
                      type: object
                      properties:
                        index:
                          type: integer
                          description: 结果索引
                        delta:
                          type: object
                          description: 模型增量返回的文本信息
                          properties:
                            role:
                              type: string
                              description: 当前对话的角色，目前默认为 `assistant`（模型）
                            content:
                              oneOf:
                                - type: string
                                  description: >-
                                    当前对话文本内容。如果调用函数则为 `null`，否则返回推理结果。

                                    对于`GLM-4.5V`系列模型，返回内容可能包含思考过程标签 `<think>
                                    </think>`，文本边界标签 `<|begin_of_box|>
                                    <|end_of_box|>`。
                                - type: array
                                  description: 当前对话的多模态内容（适用于`GLM-4V`系列）
                                  items:
                                    type: object
                                    properties:
                                      type:
                                        type: string
                                        enum:
                                          - text
                                        description: 内容类型，目前为文本
                                      text:
                                        type: string
                                        description: 文本内容
                                - type: string
                                  nullable: true
                                  description: 当使用`tool_calls`时，`content`可能为`null`
                            audio:
                              type: object
                              description: 当使用 `glm-4-voice` 模型时返回的音频内容
                              properties:
                                id:
                                  type: string
                                  description: 当前对话的音频内容`id`，可用于多轮对话输入
                                data:
                                  type: string
                                  description: 当前对话的音频内容`base64`编码
                                expires_at:
                                  type: string
                                  description: 当前对话的音频内容过期时间
                            reasoning_content:
                              type: string
                              description: 思维链内容, 仅 `glm-4.5` 系列支持
                            tool_calls:
                              type: array
                              description: 生成的应该被调用的工具信息，流式返回时会逐步生成
                              items:
                                type: object
                                properties:
                                  index:
                                    type: integer
                                    description: 工具调用索引
                                  id:
                                    type: string
                                    description: 工具调用的唯一标识符
                                  type:
                                    type: string
                                    description: 工具类型，目前支持`function`
                                    enum:
                                      - function
                                  function:
                                    type: object
                                    properties:
                                      name:
                                        type: string
                                        description: 函数名称
                                      arguments:
                                        type: string
                                        description: 函数参数，`JSON`格式字符串
                        finish_reason:
                          type: string
                          description: >-
                            模型推理终止的原因。`stop` 表示自然结束或触发stop词，`tool_calls`
                            表示模型命中函数，`length` 表示达到 `token` 长度限制，`sensitive`
                            表示内容被安全审核接口拦截（用户应判断并决定是否撤回公开内容），`network_error`
                            表示模型推理异常。
                          enum:
                            - stop
                            - length
                            - tool_calls
                            - sensitive
                            - network_error
              usage:
                allOf:
                  - type: object
                    description: 本次模型调用的 `tokens` 数量统计
                    properties:
                      prompt_tokens:
                        type: integer
                        description: >-
                          用户输入的 `tokens` 数量。对于 `glm-4-voice`，`1`秒音频=`12.5
                          Tokens`，向上取整。
                      completion_tokens:
                        type: integer
                        description: 模型输出的 `tokens` 数量
                      total_tokens:
                        type: integer
                        description: >-
                          总 `tokens` 数量，对于 `glm-4-voice` 模型，`1`秒音频=`12.5
                          Tokens`，向上取整
              content_filter:
                allOf:
                  - type: array
                    description: 返回内容安全的相关信息
                    items:
                      type: object
                      properties:
                        role:
                          type: string
                          description: >-
                            安全生效环节，包括：`role = assistant` 模型推理，`role = user`
                            用户输入，`role = history` 历史上下文
                        level:
                          type: integer
                          description: 严重程度 `level 0-3`，`level 0` 表示最严重，`3` 表示轻微
            refIdentifier: '#/components/schemas/ChatCompletionChunk'
        examples:
          example:
            value:
              id: <string>
              created: 123
              model: <string>
              choices:
                - index: 123
                  delta:
                    role: <string>
                    content: <string>
                    audio:
                      id: <string>
                      data: <string>
                      expires_at: <string>
                    reasoning_content: <string>
                    tool_calls:
                      - index: 123
                        id: <string>
                        type: function
                        function:
                          name: <string>
                          arguments: <string>
                  finish_reason: stop
              usage:
                prompt_tokens: 123
                completion_tokens: 123
                total_tokens: 123
              content_filter:
                - role: <string>
                  level: 123
        description: 业务处理成功
    default:
      application/json:
        schemaArray:
          - type: object
            properties:
              error:
                allOf:
                  - required:
                      - code
                      - message
                    type: object
                    properties:
                      code:
                        type: string
                      message:
                        type: string
            refIdentifier: '#/components/schemas/Error'
        examples:
          example:
            value:
              error:
                code: <string>
                message: <string>
        description: 请求失败
  deprecated: false
  type: path
components:
  schemas:
    VisionMultimodalContentItem:
      oneOf:
        - title: 文本
          type: object
          properties:
            type:
              type: string
              enum:
                - text
              description: 内容类型为文本
              default: text
            text:
              type: string
              description: 文本内容
          required:
            - type
            - text
          additionalProperties: false
        - title: 图片
          type: object
          properties:
            type:
              type: string
              enum:
                - image_url
              description: 内容类型为图片`URL`
              default: image_url
            image_url:
              type: object
              description: 图片信息
              properties:
                url:
                  type: string
                  description: >-
                    图片的`URL`地址或`Base64`编码。图像大小上传限制为每张图像`5M`以下，且像素不超过`6000*6000`。支持`jpg、png、jpeg`格式。`GLM4.5V`
                    限制`50`张，`GLM-4V-Plus-0111`
                    限制`5`张，`GLM-4V-Flash`限制`1`张图像，不支持`Base64`编码。
              required:
                - url
              additionalProperties: false
          required:
            - type
            - image_url
          additionalProperties: false
        - title: 视频
          type: object
          properties:
            type:
              type: string
              enum:
                - video_url
              description: 内容类型为视频输入
              default: video_url
            video_url:
              type: object
              description: 视频信息。注意：`GLM-4V-Plus-0111` 的 `video_url` 参数必须在 `content` 数组的第一位。
              properties:
                url:
                  type: string
                  description: >-
                    视频的`URL`地址。`GLM-4.5V`视频大小限制为 `200M`
                    以内。`GLM-4V-Plus`视频大小限制为`20M`以内，视频时长不超过`30s`。对于其他多模态模型，视频大小限制为`200M`以内。视频类型：`mp4`。
              required:
                - url
              additionalProperties: false
          required:
            - type
            - video_url
          additionalProperties: false
        - title: 文件
          type: object
          properties:
            type:
              type: string
              enum:
                - file_url
              description: >-
                内容类型为文件输入(仅`GLM-4.5V`支持，且不支持同时传入 `file_url` 和 `image_url` 或
                `video_url` 参数)
              default: file_url
            file_url:
              type: object
              description: 文件信息。
              properties:
                url:
                  type: string
                  description: >-
                    文件的`URL`地址，不支持`Base64`编码。支持`pdf、txt、word、jsonl、xlsx、pptx`等格式，最多支持`50`个。
              required:
                - url
              additionalProperties: false
          required:
            - type
            - file_url
          additionalProperties: false
    AudioMultimodalContentItem:
      oneOf:
        - title: 文本
          type: object
          properties:
            type:
              type: string
              enum:
                - text
              description: 内容类型为文本
              default: text
            text:
              type: string
              description: 文本内容
          required:
            - type
            - text
          additionalProperties: false
        - title: 音频
          type: object
          properties:
            type:
              type: string
              enum:
                - input_audio
              description: 内容类型为音频输入
              default: input_audio
            input_audio:
              type: object
              description: 音频信息，仅`glm-4-voice`支持音频输入
              properties:
                data:
                  type: string
                  description: 语音文件的`base64`编码。音频最长不超过 `10` 分钟。`1s`音频=`12.5 Tokens`，向上取整。
                format:
                  type: string
                  description: 语音文件的格式，支持`wav`和`mp3`
                  enum:
                    - wav
                    - mp3
              required:
                - data
                - format
              additionalProperties: false
          required:
            - type
            - input_audio
          additionalProperties: false
    FunctionToolSchema:
      type: object
      title: Function Call
      properties:
        type:
          type: string
          default: function
          enum:
            - function
        function:
          $ref: '#/components/schemas/FunctionObject'
      required:
        - type
        - function
      additionalProperties: false
    FunctionObject:
      type: object
      properties:
        name:
          type: string
          description: 要调用的函数名称。必须是 `a-z、A-Z、0-9`，或包含下划线和破折号，最大长度为 `64`。
          minLength: 1
          maxLength: 64
          pattern: ^[a-zA-Z0-9_-]+$
        description:
          type: string
          description: 函数功能的描述，供模型选择何时以及如何调用函数。
        parameters:
          $ref: '#/components/schemas/FunctionParameters'
      required:
        - name
        - description
        - parameters
    FunctionParameters:
      type: object
      description: 使用 `JSON Schema` 定义的参数。必须传递 `JSON Schema` 对象以准确定义接受的参数。如果调用函数时不需要参数，则省略。
      additionalProperties: true
    RetrievalToolSchema:
      type: object
      title: Retrieval
      properties:
        type:
          type: string
          default: retrieval
          enum:
            - retrieval
        retrieval:
          $ref: '#/components/schemas/RetrievalObject'
      required:
        - type
        - retrieval
      additionalProperties: false
    RetrievalObject:
      type: object
      properties:
        knowledge_id:
          type: string
          description: 知识库 `ID`，从平台创建或获取
        prompt_template:
          type: string
          description: >-
            请求模型的提示模板，包含占位符 `{{ knowledge }}` 和 `{{ question }}`
            的自定义请求模板。默认模板：`在文档 `{{ knowledge }}` 中搜索问题 `{{question}}`
            的答案。如果找到答案，仅使用文档中的陈述进行回应；如果没有找到答案，使用你自己的知识回答并告知用户信息不来自文档。不要重复问题，直接开始答案。`
      required:
        - knowledge_id
    ChatThinking:
      type: object
      description: 仅 `GLM-4.5` 及以上模型支持此参数配置. 控制大模型是否开启思维链。
      properties:
        type:
          type: string
          description: >-
            是否开启思维链(当开启后 `GLM-4.6` `GLM-4.5` 为模型自动判断是否思考，`GLM-4.5V` 为强制思考), 默认:
            `enabled`.
          default: enabled
          enum:
            - enabled
            - disabled
    WebSearchToolSchema:
      type: object
      title: Web Search
      properties:
        type:
          type: string
          default: web_search
          enum:
            - web_search
        web_search:
          $ref: '#/components/schemas/WebSearchObject'
      required:
        - type
        - web_search
      additionalProperties: false
    WebSearchObject:
      type: object
      properties:
        enable:
          type: boolean
          description: 是否启用搜索功能，默认值为 `false`，启用时设置为 `true`
        search_engine:
          type: string
          description: >-
            搜索引擎类型，默认为
            `search_std`；支持`search_std、search_pro、search_pro_sogou、search_pro_quark`。
          enum:
            - search_std
            - search_pro
            - search_pro_sogou
            - search_pro_quark
        search_query:
          type: string
          description: 强制触发搜索
        search_intent:
          type: string
          description: >-
            是否进行搜索意图识别，默认执行搜索意图识别。`true`：执行搜索意图识别，有搜索意图后执行搜索；`false`：跳过搜索意图识别，直接执行搜索
        count:
          type: integer
          description: >-
            返回结果的条数。可填范围：`1-50`，最大单次搜索返回`50`条，默认为`10`。支持的搜索引擎：`search_std、search_pro、search_pro_sogou`。对于`search_pro_sogou`:
            可选枚举值，`10、20、30、40、50`
          minimum: 1
          maximum: 50
        search_domain_filter:
          type: string
          description: |-
            用于限定搜索结果的范围，仅返回指定白名单域名的内容。
            白名单域名:（如 `www.example.com`）。
            支持的搜索引擎：`search_std、search_pro、search_pro_sogou`
        search_recency_filter:
          type: string
          description: >-
            搜索指定时间范围内的网页。默认为`noLimit`。可填值：`oneDay`（一天内）、`oneWeek`（一周内）、`oneMonth`（一个月内）、`oneYear`（一年内）、`noLimit`（不限，默认）。支持的搜索引擎：`search_std、search_pro、search_pro_sogou、search_pro_quark`
          enum:
            - oneDay
            - oneWeek
            - oneMonth
            - oneYear
            - noLimit
        content_size:
          type: string
          description: >-
            控制网页摘要的字数。默认值为`medium`。`medium`：返回摘要信息，满足大模型的基础推理需求。`high`：最大化上下文，信息量较大但内容详细，适合需要信息细节的场景。
          enum:
            - medium
            - high
        result_sequence:
          type: string
          description: 指定搜索结果返回的顺序是在模型回复结果之前还是之后，可选值：`before`、`after`，默认 `after`
          enum:
            - before
            - after
        search_result:
          type: boolean
          description: 是否返回搜索来源的详细信息，默认值 `false`
        require_search:
          type: boolean
          description: 是否强制搜索结果才返回回答，默认值 `false`
        search_prompt:
          type: string
          description: |-
            用于定制搜索结果处理的`Prompt`，默认`Prompt`：

            你是一位智能问答专家，具备整合信息的能力，能够进行时间识别、语义理解与矛盾信息清洗处理。
            当前日期是{{current_date}}，请以此时间为唯一基准，参考以下信息，全面、准确地回答用户问题。
            仅提炼有价值的内容用于回答，确保答案具有实时性与权威性，直接陈述答案，无需说明数据来源或内部处理过程。
      required:
        - search_engine
    MCPToolSchema:
      type: object
      title: MCP
      properties:
        type:
          type: string
          default: mcp
          enum:
            - mcp
        mcp:
          $ref: '#/components/schemas/MCPObject'
      required:
        - type
        - mcp
      additionalProperties: false
    MCPObject:
      type: object
      properties:
        server_label:
          description: >-
            `mcp server`标识，如果连接智谱的`mcp server`，以`mcp
            code`填充该字段，且无需填写`server_url`
          type: string
        server_url:
          description: '`mcp server`地址'
          type: string
        transport_type:
          description: 传输类型
          type: string
          default: streamable-http
          enum:
            - sse
            - streamable-http
        allowed_tools:
          description: 允许的工具集合
          type: array
          items:
            type: string
        headers:
          description: '`mcp server` 需要的鉴权信息'
          type: object
      required:
        - server_label
    ChatCompletionResponseMessage:
      type: object
      properties:
        role:
          type: string
          description: 当前对话角色，默认为 `assistant`
          example: assistant
        content:
          oneOf:
            - type: string
              description: >-
                当前对话文本内容。如果调用函数则为 `null`，否则返回推理结果。

                对于`GLM-4.5V`系列模型，返回内容可能包含思考过程标签 `<think> </think>`，文本边界标签
                `<|begin_of_box|> <|end_of_box|>`。
            - type: array
              description: 多模态回复内容，适用于`GLM-4V`系列模型
              items:
                type: object
                properties:
                  type:
                    type: string
                    enum:
                      - text
                    description: 回复内容类型，目前为文本
                  text:
                    type: string
                    description: 文本内容
            - type: string
              nullable: true
              description: 当使用`tool_calls`时，`content`可能为`null`
        reasoning_content:
          type: string
          description: 思维链内容，仅在使用 `glm-4.5` 系列, `glm-4.1v-thinking` 系列模型时返回。
        audio:
          type: object
          description: 当使用 `glm-4-voice` 模型时返回的音频内容
          properties:
            id:
              type: string
              description: 当前对话的音频内容`id`，可用于多轮对话输入
            data:
              type: string
              description: 当前对话的音频内容`base64`编码
            expires_at:
              type: string
              description: 当前对话的音频内容过期时间
        tool_calls:
          type: array
          description: 生成的应该被调用的函数名称和参数。
          items:
            $ref: '#/components/schemas/ChatCompletionResponseMessageToolCall'
    ChatCompletionResponseMessageToolCall:
      type: object
      properties:
        function:
          type: object
          description: 包含生成的函数名称和 `JSON` 格式参数。
          properties:
            name:
              type: string
              description: 生成的函数名称。
            arguments:
              type: object
              description: 生成的函数调用参数的 `JSON` 格式。调用函数前请验证参数。
          required:
            - name
            - arguments
        mcp:
          type: object
          description: '`MCP` 工具调用参数'
          properties:
            id:
              description: '`mcp` 工具调用唯一标识'
              type: string
            type:
              description: 工具调用类型, 例如 `mcp_list_tools, mcp_call`
              type: string
              enum:
                - mcp_list_tools
                - mcp_call
            server_label:
              description: '`MCP`服务器标签'
              type: string
            error:
              description: 错误信息
              type: string
            tools:
              description: '`type = mcp_list_tools` 时的工具列表'
              type: array
              items:
                type: object
                properties:
                  name:
                    description: 工具名称
                    type: string
                  description:
                    description: 工具描述
                    type: string
                  annotations:
                    description: 工具注解
                    type: object
                  input_schema:
                    description: 工具输入参数规范
                    type: object
                    properties:
                      type:
                        description: 固定值 'object'
                        type: string
                        default: object
                        enum:
                          - object
                      properties:
                        description: 参数属性定义
                        type: object
                      required:
                        description: 必填属性列表
                        type: array
                        items:
                          type: string
                      additionalProperties:
                        description: 是否允许额外参数
                        type: boolean
            arguments:
              description: 工具调用参数，参数为 `json` 字符串
              type: string
            name:
              description: 工具名称
              type: string
            output:
              description: 工具返回的结果输出
              type: object
        id:
          type: string
          description: 命中函数的唯一标识符。
        type:
          type: string
          description: 调用的工具类型，目前仅支持 'function', 'mcp'。

````

---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.bigmodel.cn/llms.txt