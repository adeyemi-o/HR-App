import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    Preview,
    Section,
    Text,
    Tailwind,
} from "npm:@react-email/components@0.0.22";
import * as React from "npm:react@18.3.1";

interface RequirementRequestEmailProps {
    applicantName: string;
    missingItems: string[];
    uploadUrl: string;
}

export const RequirementRequestEmail = ({
    applicantName = "Applicant",
    missingItems = ["I-9 Form", "Vaccination Record"],
    uploadUrl = "https://prolific-hr.com/upload",
}: RequirementRequestEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Action Required: Missing Documents</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        <Section className="mt-[32px]">
                            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Action Required
                            </Heading>
                            <Text className="text-black text-[14px] leading-[24px]">
                                Hello {applicantName},
                            </Text>
                            <Text className="text-black text-[14px] leading-[24px]">
                                We are missing the following documents for your application:
                            </Text>
                            <Section className="bg-gray-100 p-4 rounded-md my-4">
                                <ul className="list-disc pl-5 m-0">
                                    {missingItems.map((item, index) => (
                                        <li key={index} className="text-black text-[14px] mb-1">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </Section>
                            <Section className="text-center mt-[32px] mb-[32px]">
                                <Button
                                    className="bg-[#3B82F6] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                                    href={uploadUrl}
                                >
                                    Upload Documents
                                </Button>
                            </Section>
                            <Text className="text-black text-[14px] leading-[24px]">
                                Please upload these documents as soon as possible to proceed with your application.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default RequirementRequestEmail;
