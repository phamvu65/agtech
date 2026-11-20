# Issue tracker: GitHub

Issues và specs của dự án nằm tại phamvu65/agtech. Dùng gh CLI với repository đích rõ ràng: --repo phamvu65/agtech.

## Các thao tác

- Trước lần tạo issue đầu tiên của phiên, kiểm tra git remote -v và gh repo view --json nameWithOwner. Đích phải là phamvu65/agtech.
- Tạo: gh issue create --repo phamvu65/agtech --title "..." --body-file <file> --label "...". Ghi nội dung nhiều dòng vào tệp UTF-8 trước khi gọi lệnh.
- Đọc: gh issue view <number> --repo phamvu65/agtech --json number,title,body,labels,comments.
- Liệt kê: gh issue list --repo phamvu65/agtech --state open --json number,title,body,labels; thêm bộ lọc theo yêu cầu.
- Cập nhật nội dung: gh issue edit <number> --repo phamvu65/agtech --body-file <file>.
- Nhãn: gh issue edit <number> --repo phamvu65/agtech --add-label "..." hoặc --remove-label "...".
- Bình luận: gh issue comment <number> --repo phamvu65/agtech --body-file <file>.
- Đóng: đăng giải thích trước, sau đó gh issue close <number> --repo phamvu65/agtech.

## Quan hệ công việc

Dùng sub-issue và blocking dependency gốc của GitHub khi công cụ hỗ trợ; kiểm tra gh --help cho phiên bản đang cài. Khi API yêu cầu issue_id, dùng database ID, không dùng số issue hoặc node_id.

Nếu quan hệ gốc không khả dụng, ghi Part of #<parent> và Blocked by: #<blocker> trong nội dung, kèm danh sách con ở issue cha. Công việc chỉ sẵn sàng khi mọi blocker đã hoàn tất.

## Quy ước skill

Publish to the issue tracker nghĩa là tạo GitHub issue. Fetch the relevant ticket nghĩa là đọc đầy đủ nội dung và bình luận. Spec/ticket hoàn chỉnh dùng nhãn theo triage-labels.md. Trước tạo, kiểm tra issue hiện có để tránh xuất bản trùng.

## Pull requests as a triage surface

PRs as a request surface: no.
