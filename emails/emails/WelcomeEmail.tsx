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
    Img,
    Tailwind,
} from "@react-email/components";
import * as React from "react";

interface WelcomeEmailProps {
    applicantName: string;
    loginUrl: string;
    username: string;
    logoUrl?: string;
}

export const WelcomeEmail = ({
    applicantName = "Applicant",
    loginUrl = "https://training.prolific-hr.com/login",
    username = "applicant.user",
    logoUrl = "https://placehold.co/150x50/png?text=Prolific+Homecare",
}: WelcomeEmailProps) => {
    return (
        <Html>
            <Head />
            <Preview>Welcome to Prolific Homecare!</Preview>
            <Tailwind>
                <Body className="bg-white my-auto mx-auto font-sans">
                    <Container className="border border-solid border-[#eaeaea] rounded my-[40px] mx-auto p-[20px] max-w-[465px]">
                        {logoUrl && (
                            <Section className="mt-[20px] mb-[20px]">
                                <Img
                                    src={logoUrl}
                                    width="150"
                                    height="50"
                                    alt="Prolific Homecare"
                                    className="mx-auto object-contain"
                                />
                            </Section>
                        )}
                        <Section className="mt-[32px]">
                            <Heading className="text-black text-[24px] font-normal text-center p-0 my-[30px] mx-0">
                                Welcome to the Team!
                            </Heading>
                            <Text className="text-black text-[14px] leading-[24px]">
                                Hello {applicantName},
                            </Text>
                            <Text className="text-black text-[14px] leading-[24px]">
                                We are thrilled to have you join Prolific Homecare. Your onboarding is complete, and you can now access our training portal.
                            </Text>
                            <Section className="bg-gray-100 p-4 rounded-md my-4">
                                <Text className="text-black text-[14px] m-0 font-semibold">
                                    Your Login Credentials:
                                </Text>
                                <Text className="text-black text-[14px] m-0 mt-2">
                                    <strong>Username:</strong> {username}
                                    <br />
                                    <strong>Password:</strong> (The password you set during application or sent separately)
                                </Text>
                            </Section>
                            <Section className="text-center mt-[32px] mb-[32px]">
                                <Button
                                    className="bg-[#3B82F6] rounded text-white text-[12px] font-semibold no-underline text-center px-5 py-3"
                                    href={loginUrl}
                                >
                                    Login to Training Portal
                                </Button>
                            </Section>
                            <Text className="text-black text-[14px] leading-[24px]">
                                If you have any questions, please contact HR.
                            </Text>
                        </Section>
                    </Container>
                </Body>
            </Tailwind>
        </Html>
    );
};

export default WelcomeEmail;
